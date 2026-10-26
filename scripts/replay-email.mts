// Replays real Gmail messages through the email pipeline without saving anything:
// candidates → Jev → decide, against the tracker as it is now.
//   node --conditions=react-server --import tsx scripts/replay-email.mts <gmail message id>...
// Exits 1 if any message comes out "ignored".
import { createClient } from "@supabase/supabase-js";
import * as gmail from "@/lib/email/gmail";
import { processEmail } from "@/lib/email/process";
import { decryptToken } from "@/lib/email/token-crypto";

process.loadEnvFile(".env.local");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const { data: conn, error } = await admin
  .from("email_connections")
  .select("user_id, refresh_token_encrypted")
  .eq("provider", "gmail")
  .eq("status", "active")
  .single();
if (error) throw error;
const token = await gmail.accessToken(decryptToken(conn.refresh_token_encrypted));

let failed = false;
for (const id of process.argv.slice(2)) {
  const email = await gmail.getMessage(token, id);
  if (!email) throw new Error(`${id}: not found`);
  const r = await processEmail(admin, conn.user_id, email, { dryRun: true });
  console.log(JSON.stringify({
    id,
    subject: email.subject,
    from: `${email.fromName ?? ""} <${email.fromAddress}>`,
    candidates: r.candidates.map((c) => `${c.company} / ${c.job_title} (${c.matchedBy})`),
    application: r.classification?.raw.application ?? null,
    kind: r.classification?.answers.kind ?? null,
    outcome: r.decision.outcome,
    reason: r.decision.reason,
    body_head: email.text.slice(0, 600),
  }, null, 2));
  if (r.decision.outcome === "ignored") failed = true;
}
process.exit(failed ? 1 : 0);
