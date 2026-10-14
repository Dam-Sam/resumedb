import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { CONNECTION_COLUMNS, syncGmail, type GmailConnection } from "@/lib/email/gmail-sync";
import { createAdminClient } from "@/lib/supabase/admin";

// Each email is classified with Jev; a busy inbox can take a little while.
export const maxDuration = 120;

// Google's keys for the OIDC token Pub/Sub attaches to each push.
const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

// Gmail → Pub/Sub → here, whenever a connected inbox changes. The message only
// names the mailbox; syncGmail reads what's new. Any non-2xx makes Pub/Sub
// retry later, so only real failures return one.
export async function POST(request: NextRequest) {
  if (!(await fromPubSub(request))) return new NextResponse(null, { status: 401 });

  const body = await request.json().catch(() => null);
  let address: string | undefined;
  try {
    address = JSON.parse(Buffer.from(body?.message?.data ?? "", "base64").toString("utf8")).emailAddress;
  } catch {
    // Not a Gmail notification; acknowledge it so it isn't redelivered.
  }
  if (!address) return new NextResponse(null, { status: 204 });

  const admin = createAdminClient();
  const { data: conn, error } = await admin
    .from("email_connections")
    .select(CONNECTION_COLUMNS)
    .eq("provider", "gmail")
    .eq("email_address", address.toLowerCase())
    .eq("status", "active")
    .maybeSingle();
  if (error) {
    console.error("gmail push lookup failed:", error.message);
    return new NextResponse(null, { status: 500 });
  }
  // Disconnected (or never connected): nothing to do, and no point retrying.
  if (!conn) return new NextResponse(null, { status: 204 });

  try {
    await syncGmail(admin, conn as GmailConnection);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("gmail sync failed:", err);
    await admin
      .from("email_connections")
      .update({ last_error: err instanceof Error ? err.message : String(err) })
      .eq("id", conn.id);
    return new NextResponse(null, { status: 500 });
  }
}

// The push subscription is set to sign each request as our service account,
// for this URL. Anything else is someone else calling the endpoint.
async function fromPubSub(request: NextRequest): Promise<boolean> {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, GOOGLE_KEYS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: process.env.GMAIL_PUSH_AUDIENCE,
    });
    return payload.email === process.env.GMAIL_PUSH_SERVICE_ACCOUNT && payload.email_verified === true;
  } catch {
    return false;
  }
}
