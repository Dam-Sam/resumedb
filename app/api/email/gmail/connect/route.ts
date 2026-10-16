import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { authUrl, STATE_COOKIE } from "@/lib/email/gmail";
import { createClient } from "@/lib/supabase/server";

// "Connect Gmail" lands here: send the user to Google's consent screen.
// The random state is checked on the way back, so a callback can't be forged.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", request.url));
  if (!process.env.GOOGLE_CLIENT_ID) return NextResponse.redirect(new URL("/integrations", request.url));

  const state = randomBytes(24).toString("base64url");
  const redirectUri = new URL("/api/email/gmail/callback", request.url).toString();
  const response = NextResponse.redirect(authUrl(redirectUri, state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax", // sent on Google's redirect back, which is a top-level GET
    path: "/api/email/gmail",
    maxAge: 600,
  });
  return response;
}
