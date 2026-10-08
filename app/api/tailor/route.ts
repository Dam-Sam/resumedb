import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { tailor } from "@/lib/ai/tailor";
import { loadProfile } from "@/lib/profile/repository";
import { createClient } from "@/lib/supabase/server";

// Tailoring with Claude can take a while.
export const maxDuration = 120;

const Input = z.object({
  company: z.string().trim().min(1),
  jobTitle: z.string().trim().min(1),
  jobDescription: z.string().trim().min(1),
  includeSummary: z.boolean(),
});

// Profile + posting → Claude → validated TailoredResume (see lib/ai/tailor.ts).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const input = Input.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: "Company, job title and job description are all required." }, { status: 400 });
  }

  try {
    const profile = await loadProfile(supabase, user.id);
    if (!profile.items.length) {
      return NextResponse.json({ error: "Your profile is empty. Add your experience on the Profile tab first." }, { status: 400 });
    }
    return NextResponse.json(await tailor(supabase, user.id, profile, input.data));
  } catch (err) {
    // The failure is also logged in llm_runs when it came from the model.
    console.error("tailor failed:", err);
    return NextResponse.json({ error: "Something went wrong while tailoring." }, { status: 502 });
  }
}
