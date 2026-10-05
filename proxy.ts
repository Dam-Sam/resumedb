import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { homeFor } from "@/lib/supabase/routing";

const PROTECTED = ["/profile", "/tailor", "/onboarding"];
const SIGNED_OUT_ONLY = ["/", "/sign-in", "/sign-up"];

// Runs before every page: refreshes the session cookie and sends people
// to the right place depending on whether they're signed in.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Must be called right after creating the client: it refreshes an expired session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const redirectTo = (to: string) => {
    const redirect = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    return redirectTo("/sign-in");
  }
  if (user && SIGNED_OUT_ONLY.includes(path)) {
    return redirectTo(await homeFor(supabase, user.id));
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except API routes, Next.js internals, and static files.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
