"use server";

import { refresh } from "next/cache";
import { CONNECTION_COLUMNS, disconnectGmail, type GmailConnection } from "@/lib/email/gmail-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Stops watching the inbox, hands the access back to Google, and forgets the token.
// Emails already read stay on the tracker's timeline.
export async function disconnectEmail(connectionId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  // The token column is only readable with the service role, so the row is
  // looked up there, scoped to this user.
  const admin = createAdminClient();
  const { data: conn, error } = await admin
    .from("email_connections")
    .select(CONNECTION_COLUMNS)
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !conn) return { error: "Couldn't find that connection." };

  await disconnectGmail(conn as GmailConnection);
  const { error: deleteError } = await admin.from("email_connections").delete().eq("id", conn.id).eq("user_id", user.id);
  if (deleteError) {
    console.error("disconnectEmail failed:", deleteError.message);
    return { error: "Couldn't disconnect. Please try again." };
  }
  refresh();
  return {};
}
