import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as gmail from "./gmail";
import { processEmail } from "./process";
import { decryptToken } from "./token-crypto";

// Keeping one connected Gmail inbox in step with the tracker. Runs with the
// service-role client (nobody is signed in when a push arrives), so every write
// is scoped by the connection's own user_id.

export interface GmailConnection {
  id: string;
  user_id: string;
  email_address: string;
  refresh_token_encrypted: string;
  history_id: string | null;
  watch_expires_at: string | null;
}

export const CONNECTION_COLUMNS = "id, user_id, email_address, refresh_token_encrypted, history_id, watch_expires_at";

async function update(admin: SupabaseClient, id: string, fields: Record<string, unknown>) {
  const { error } = await admin.from("email_connections").update(fields).eq("id", id);
  if (error) throw error;
}

// A fresh access token, or null after marking the connection revoked.
async function access(admin: SupabaseClient, conn: GmailConnection): Promise<string | null> {
  try {
    return await gmail.accessToken(decryptToken(conn.refresh_token_encrypted));
  } catch (err) {
    if (!(err instanceof gmail.GmailAuthError)) throw err;
    await update(admin, conn.id, {
      status: "revoked",
      last_error: "Google no longer allows access to this inbox. Reconnect Gmail.",
    });
    return null;
  }
}

// Reads every inbox message since the saved history id and runs each through
// the pipeline. The history id only moves on once all of them are done, so a
// failure is retried from the same point (already-handled emails are skipped).
export async function syncGmail(admin: SupabaseClient, conn: GmailConnection): Promise<{ processed: number }> {
  const token = await access(admin, conn);
  if (!token) return { processed: 0 };

  if (!conn.history_id) {
    // No starting point yet: start from now.
    const profile = await gmail.getProfile(token);
    await update(admin, conn.id, { history_id: profile.historyId, last_synced_at: new Date().toISOString() });
    return { processed: 0 };
  }

  let batch: { ids: string[]; historyId: string };
  try {
    batch = await gmail.newInboxMessages(token, conn.history_id);
  } catch (err) {
    if (!(err instanceof gmail.HistoryExpiredError)) throw err;
    // Gmail only keeps about a week of history. Pick up from now and say so.
    const profile = await gmail.getProfile(token);
    await update(admin, conn.id, {
      history_id: profile.historyId,
      last_synced_at: new Date().toISOString(),
      last_error: "Some emails were missed while syncing was paused. New emails will be read as usual.",
    });
    return { processed: 0 };
  }

  let processed = 0;
  for (const id of batch.ids) {
    const email = await gmail.getMessage(token, id);
    if (!email) continue;
    const result = await processEmail(admin, conn.user_id, email);
    if (!result.duplicate) processed++;
  }

  await update(admin, conn.id, {
    history_id: batch.historyId,
    status: "active",
    last_error: null,
    last_synced_at: new Date().toISOString(),
  });
  return { processed };
}

// Starts or renews push notifications. Returns false if access is gone.
export async function renewWatch(admin: SupabaseClient, conn: GmailConnection): Promise<boolean> {
  const token = await access(admin, conn);
  if (!token) return false;
  const { historyId, expiresAt } = await gmail.watch(token);
  // Keep the existing history id when there is one, so nothing between the old
  // watch and this one is skipped.
  await update(admin, conn.id, { watch_expires_at: expiresAt, history_id: conn.history_id ?? historyId });
  return true;
}

// Stops notifications and gives the access back to Google. Best effort: the
// row is deleted by the caller either way.
export async function disconnectGmail(conn: GmailConnection) {
  try {
    const refresh = decryptToken(conn.refresh_token_encrypted);
    const token = await gmail.accessToken(refresh);
    await gmail.stopWatch(token).catch(() => {});
    await gmail.revoke(refresh);
  } catch {
    // Already revoked or expired; nothing to undo on Google's side.
  }
}
