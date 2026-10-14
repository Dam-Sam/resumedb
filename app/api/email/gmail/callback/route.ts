import { NextResponse, type NextRequest } from "next/server";
import * as gmail from "@/lib/email/gmail";
import { CONNECTION_COLUMNS, renewWatch, type GmailConnection } from "@/lib/email/gmail-sync";
import { encryptToken } from "@/lib/email/token-crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Google sends the user back here after the consent screen. Swap the code for
// a refresh token, save it encrypted, and start push notifications.
export async function GET(request: NextRequest) {
  const done = (result: string) => {
    const response = NextResponse.redirect(new URL(`/profile?gmail=${result}`, request.url));
    response.cookies.delete({ name: gmail.STATE_COOKIE, path: "/api/email/gmail" });
    return response;
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", request.url));

  const params = request.nextUrl.searchParams;
  const state = request.cookies.get(gmail.STATE_COOKIE)?.value;
  if (params.get("error")) return done("cancelled");
  const code = params.get("code");
  if (!code || !state || params.get("state") !== state) return done("failed");

  try {
    const redirectUri = new URL("/api/email/gmail/callback", request.url).toString();
    const tokens = await gmail.exchangeCode(code, redirectUri);
    // The consent screen lets people untick Gmail access while still signing in.
    if (!tokens.scope.split(" ").includes(gmail.GMAIL_SCOPE)) return done("no-access");
    if (!tokens.refresh_token) return done("failed");

    const { emailAddress } = await gmail.getProfile(tokens.access_token);
    const address = emailAddress.toLowerCase();
    const admin = createAdminClient();

    const { data: existing, error: lookupError } = await admin
      .from("email_connections")
      .select("user_id")
      .eq("provider", "gmail")
      .eq("email_address", address)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing && existing.user_id !== user.id) return done("taken");

    // Reconnecting keeps the saved history id, so nothing in between is skipped.
    const { data: conn, error } = await admin
      .from("email_connections")
      .upsert(
        {
          user_id: user.id,
          provider: "gmail",
          email_address: address,
          refresh_token_encrypted: encryptToken(tokens.refresh_token),
          status: "active",
          last_error: null,
        },
        { onConflict: "provider,email_address" },
      )
      .select(CONNECTION_COLUMNS)
      .single();
    if (error) throw error;

    await renewWatch(admin, conn as GmailConnection);
    return done("connected");
  } catch (err) {
    console.error("gmail callback failed:", err);
    return done("failed");
  }
}
