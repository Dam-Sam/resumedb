import { NextResponse, type NextRequest } from "next/server";
import { CONNECTION_COLUMNS, renewWatch, syncGmail, type GmailConnection } from "@/lib/email/gmail-sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

// Daily (vercel.json): renew every push notification watch, and catch up on
// anything a lost notification missed. Watches lapse after 7 days; Google
// recommends renewing once a day, which leaves room for a few failed runs.
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

  const results = [];
  for (const conn of data as GmailConnection[]) {
    try {
      if (!(await renewWatch(admin, conn))) {
        results.push({ id: conn.id, result: "revoked" });
        continue;
      }
      const { processed } = await syncGmail(admin, conn);
      results.push({ id: conn.id, result: "renewed", processed });
    } catch (err) {
      console.error(`renew failed for connection ${conn.id}:`, err);
      results.push({ id: conn.id, result: "error" });
    }
  }
  return NextResponse.json({ results });
}
