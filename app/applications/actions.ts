"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import * as repo from "@/lib/applications/repository";
import { acceptSuggestion, dismissSuggestion } from "@/lib/email/suggestions";
import type { FinalResume } from "@/lib/resume/final";
import { createClient } from "@/lib/supabase/server";

// Tracker changes: check who's signed in, write through the repository
// (RLS keeps it to their own rows).

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const SaveInput = z.object({
  id: z.uuid().optional(),
  company: z.string().trim().min(1),
  jobTitle: z.string().trim().min(1),
  jobDescription: z.string().trim().min(1),
  resume: z.object({ name: z.string(), contactParts: z.array(z.string()), sections: z.array(z.any()) }),
});

// Called on every download. The first one creates the application; later ones
// (same tailoring, so same id) overwrite its frozen resume.
export async function saveApplication(input: z.input<typeof SaveInput>): Promise<{ id?: string; error?: string }> {
  const parsed = SaveInput.safeParse(input);
  if (!parsed.success) return { error: "Couldn't save to your Tracker." };
  const { id, company, jobTitle, jobDescription } = parsed.data;
  const resume = parsed.data.resume as FinalResume;

  const { supabase, user } = await signedIn();
  if (!user) return { error: "Please sign in again." };
  try {
    if (id) {
      await repo.overwriteResume(supabase, id, resume);
      return { id };
    }
    const newId = await repo.createApplication(supabase, user.id, {
      company,
      job_title: jobTitle,
      job_description: jobDescription,
      resume,
    });
    return { id: newId };
  } catch (err) {
    console.error("saveApplication failed:", err);
    return { error: "Couldn't save to your Tracker." };
  }
}

// Deletes the selected Tracker rows. RLS keeps it to the user's own applications.
export async function deleteApplications(ids: string[]): Promise<{ error?: string }> {
  const parsed = z.array(z.uuid()).min(1).max(1000).safeParse(ids);
  if (!parsed.success) return { error: "Nothing to delete." };
  const { supabase, user } = await signedIn();
  if (!user) return { error: "Please sign in again." };
  try {
    await repo.deleteApplications(supabase, [...new Set(parsed.data)]);
  } catch (err) {
    console.error("deleteApplications failed:", err);
    return { error: "Couldn't delete. Please try again." };
  }
  refresh();
  return {};
}

export async function setStatus(id: string, status: string): Promise<{ error?: string }> {
  if (!(repo.STATUSES as readonly string[]).includes(status)) return { error: "Unknown status." };
  const { supabase, user } = await signedIn();
  if (!user) return { error: "Please sign in again." };
  try {
    await repo.setStatus(supabase, id, status as repo.Status);
  } catch (err) {
    console.error("setStatus failed:", err);
    return { error: "Couldn't update the status. Please try again." };
  }
  refresh();
  return {};
}

// A suggestion from an email: update the status it proposed, or set it aside.
export async function answerSuggestion(id: string, answer: "accept" | "dismiss"): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(id).success) return { error: "Unknown suggestion." };
  const { supabase, user } = await signedIn();
  if (!user) return { error: "Please sign in again." };
  try {
    if (answer === "dismiss") await dismissSuggestion(supabase, id);
    else if (!(await acceptSuggestion(supabase, id))) {
      refresh();
      return { error: "This application's status has changed since. Nothing was updated." };
    }
  } catch (err) {
    console.error("answerSuggestion failed:", err);
    return { error: "Couldn't save that. Please try again." };
  }
  refresh();
  return {};
}
