import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/supabase/routing";

// The confirmation-email link (and later Google) lands here with a one-time code.
// Swap it for a session cookie, then send the user to onboarding or tailoring.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL("/sign-in?error=link", request.url));
  }

  return NextResponse.redirect(new URL(await homeFor(supabase, data.user.id), request.url));
}
