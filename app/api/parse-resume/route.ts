import { NextResponse, type NextRequest } from "next/server";
import { parseResume } from "@/lib/ai/parse-resume";
import { getActivePrompt } from "@/lib/ai/prompts";
import { extractText, MIN_RESUME_CHARS, resumeKind } from "@/lib/extract-text";
import {
  clearProfileContent,
  hasProfile,
  saveBackground,
  saveEmptyContact,
  saveParsedProfile,
} from "@/lib/profile/repository";
import { createClient } from "@/lib/supabase/server";

// Reading a resume with Claude can take a while.
export const maxDuration = 120;

const MAX_BYTES = 4 * 1024 * 1024;

// Resume file → extract text → Claude → saved profile rows. First time (onboarding)
// it also takes a background (saved only once the resume reads, or manual=1 skips the resume); later imports on /profile pass mode=add|replace.
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

  const form = await request.formData();
  const existing = await hasProfile(supabase, user.id);
  const mode = form.get("mode");
  // Onboarding runs once; after that an import must say whether to add or replace.
  if (existing && mode !== "add" && mode !== "replace") {
    return NextResponse.json({ error: "You already have a profile." }, { status: 409 });
  }
  const background = String(form.get("background") ?? "");

  // Onboarding without a resume: start from an empty profile.
  if (!existing && form.get("manual") === "1") {
    await saveBackground(supabase, user.id, background);
    await saveEmptyContact(supabase, user.id);
    return NextResponse.json({ ok: true });
  }
  const file = form.get("resume");

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

  // The name can lie: check the file's first bytes really are a PDF (%PDF) or a Word zip (PK).
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const magic = kind === "pdf" ? [0x25, 0x50, 0x44, 0x46] : [0x50, 0x4b];
  if (!magic.every((b, i) => head[i] === b)) {
    return NextResponse.json(
      { error: `That doesn't look like a real ${kind === "pdf" ? "PDF" : "Word"} file. Please upload your resume again.` },
      { status: 400 },
    );
  }

  // Before saving anything: if the prompt can't be loaded, fail with Retry
  // instead of treating the resume as unreadable.
  const prompt = await getActivePrompt(supabase, "parse");

  let text = "";
  try {
    text = await extractText(await file.arrayBuffer(), kind);
  } catch (err) {
    console.error("Text extraction failed:", err);
  }

  if (text.length >= MIN_RESUME_CHARS) {
    try {
      const parsed = await parseResume(supabase, user.id, prompt, text);
      // A file with no experience, projects, education or skills isn't a resume.
      if (parsed.items.length || parsed.skills.length) {
        // Only clear after the resume parsed, so a failed read never wipes the profile.
        if (mode === "replace") await clearProfileContent(supabase, user.id);
        if (!existing) await saveBackground(supabase, user.id, background);
        await saveParsedProfile(supabase, user.id, parsed, { addToExisting: mode === "add" });
        return NextResponse.json({ ok: true });
      }
    } catch (err) {
      console.error("Resume parsing failed:", err);
    }
  }

  // Couldn't read it. An existing profile stays as it was.
  if (existing) return NextResponse.json({ unreadable: true });
  // Onboarding saves nothing, so the user can pick a different file.
  return NextResponse.json({
    error:
      "We couldn't find a resume in that file. Make sure it's a text-based PDF or Word document (not a scan or photo) that lists your experience, education or skills.",
  });
}
