import { NextResponse, type NextRequest } from "next/server";
import { devToolsEnabled } from "@/lib/dev/guard";
import { PERSONAS, signInAs, type PersonaKey } from "@/lib/dev/personas";
import { homeFor } from "@/lib/supabase/routing";
import { createClient } from "@/lib/supabase/server";

// Dev only: /dev/login?as=new|populated[&reset=1] signs in as a seeded user.
export async function GET(request: NextRequest) {
  if (!devToolsEnabled()) return new NextResponse("Not found", { status: 404 });

  const as = request.nextUrl.searchParams.get("as") ?? "";
  if (!(as in PERSONAS)) return new NextResponse("Unknown persona", { status: 400 });
  const reset = request.nextUrl.searchParams.get("reset") === "1";

  await signInAs(as as PersonaKey, { reset });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const to = request.nextUrl.searchParams.get("to") ?? (await homeFor(supabase, user!.id));
  // Only same-site paths, so this can't bounce anywhere else.
  return NextResponse.redirect(new URL(to.startsWith("/") ? to : "/", request.url));
}
