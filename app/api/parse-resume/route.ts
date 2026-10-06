import { NextResponse, type NextRequest } from "next/server";
import { parseResume } from "@/lib/ai/parse-resume";
import { extractText, MIN_RESUME_CHARS, resumeKind } from "@/lib/extract-text";
import {
  hasProfile,
  saveBackground,
  saveEmptyContact,
  saveParsedProfile,
} from "@/lib/profile/repository";
import { createClient } from "@/lib/supabase/server";

// Reading a resume with Claude can take a while.
export const maxDuration = 120;

const MAX_BYTES = 4 * 1024 * 1024;

// Onboarding: resume file + background → extract text → Claude → saved profile rows.
export async function POST(request: NextRequest) {
  try {
    return await handle(request);
  } catch (err) {
    // e.g. a database error while saving; the details go to the server terminal.
    console.error("parse-resume failed:", err);
    return NextResponse.json({ error: "Something went wrong saving your profile. Please try again." }, { status: 500 });
  }
}

async function handle(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  // Onboarding runs once; afterwards the profile is edited on /profile.
  if (await hasProfile(supabase, user.id)) {
    return NextResponse.json({ error: "You already have a profile." }, { status: 409 });
  }

  const form = await request.formData();
  const file = form.get("resume");
  const background = String(form.get("background") ?? "");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please choose a resume file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That file is over 4 MB. Please upload a smaller one." }, { status: 400 });
  }
  const kind = resumeKind(file.name);
  if (!kind) {
    return NextResponse.json(
      { error: "Please upload a PDF or Word (.docx) file. Old .doc files aren't supported; save it as .docx or PDF." },
      { status: 400 },
    );
  }

  await saveBackground(supabase, user.id, background);

  let text = "";
  try {
    text = await extractText(await file.arrayBuffer(), kind);
  } catch (err) {
    console.error("Text extraction failed:", err);
  }

  if (text.length >= MIN_RESUME_CHARS) {
    try {
      const parsed = await parseResume(supabase, user.id, text);
      await saveParsedProfile(supabase, user.id, parsed);
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("Resume parsing failed:", err);
    }
  }

  // Couldn't read it: keep the background, and let the user fill in the rest by hand.
  await saveEmptyContact(supabase, user.id);
  return NextResponse.json({ unreadable: true });
}
