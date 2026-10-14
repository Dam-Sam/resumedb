import { NextResponse, type NextRequest } from "next/server";
import { CONNECTION_COLUMNS, renewWatch, syncGmail, type GmailConnection } from "@/lib/email/gmail-sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

// Gmail watches lapse after 7 days, so they're renewed well before that.
const RENEW_WITHIN_MS = 2 * 24 * 60 * 60 * 1000;

// Daily (vercel.json): renew push notifications that are about to lapse, and
// catch up on anything a lost notification missed.
export async function GET(request: NextRequest) {
  // Vercel sends the project's CRON_SECRET; anyone else is turned away.
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse(null, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("email_connections")
    .select(CONNECTION_COLUMNS)
    .eq("provider", "gmail")
    .eq("status", "active");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const soon = Date.now() + RENEW_WITHIN_MS;
  const results = [];
  for (const conn of data as GmailConnection[]) {
    try {
      const due = !conn.watch_expires_at || new Date(conn.watch_expires_at).getTime() < soon;
      if (due && !(await renewWatch(admin, conn))) {
        results.push({ id: conn.id, result: "revoked" });
        continue;
      }
      const { processed } = await syncGmail(admin, conn);
      results.push({ id: conn.id, result: due ? "renewed" : "ok", processed });
    } catch (err) {
      console.error(`renew failed for connection ${conn.id}:`, err);
      results.push({ id: conn.id, result: "error" });
    }
  }
  return NextResponse.json({ results });
}
