import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildFinalResume } from "@/lib/resume/final";
import { STATUSES, type Status } from "@/lib/applications/repository";
import { clearProfileContent, hasProfile, saveParsedProfile } from "@/lib/profile/repository";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEV_PARSED, devTailorResponse } from "./fixtures";

export const PERSONAS = {
  new: { email: "dev-new@resumedb.test", label: "New user", note: "No profile yet: lands on Onboarding." },
  populated: {
    email: "dev-populated@resumedb.test",
    label: "Populated user",
    note: "Profile and a spread of tracked applications.",
  },
} as const;
export type PersonaKey = keyof typeof PERSONAS;

// Only ever used on seeded @resumedb.test accounts, which can't receive mail.
const PASSWORD = "dev-only-not-a-secret";

// [company, job title, status, days ago]
const APPLICATIONS: [string, string, Status, number][] = [
  ["Northwind", "Backend Engineer", "interview", 2],
  ["Contoso", "Platform Engineer", "applied", 3],
  ["Fabrikam", "Software Engineer", "screening", 6],
  ["Initech", "Full-Stack Developer", "received", 9],
  ["Globex", "API Engineer", "offer", 13],
  ["Umbrella", "Backend Developer", "rejected", 20],
];

// Seeding runs as the persona itself (the admin client only creates the auth
// user), so it needs no extra database grants.
// Signs the browser in as the persona, creating and seeding the user as needed.
// The new user is reset on every sign-in so Onboarding stays reachable.
export async function signInAs(key: PersonaKey, { reset = false }: { reset?: boolean } = {}) {
  const { email } = PERSONAS[key];
  const supabase = await createClient();
  const admin = createAdminClient();

  let { data, error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) {
    const created = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (created.error) throw created.error;
    ({ data, error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD }));
    if (error) throw error;
  }
  const userId = data.user!.id;

  if (key === "new") await wipe(supabase, userId);
  else if (reset || !(await hasProfile(supabase, userId))) {
    await wipe(supabase, userId);
    await seedPopulated(supabase, userId);
  }
}

async function wipe(supabase: SupabaseClient, userId: string) {
  await clearProfileContent(supabase, userId);
  await supabase.from("profile_summaries").delete().eq("user_id", userId);
  await supabase.from("contact_info").delete().eq("user_id", userId);
  await supabase.from("applications").delete().eq("user_id", userId);
}

async function seedPopulated(supabase: SupabaseClient, userId: string) {
  await saveParsedProfile(supabase, userId, DEV_PARSED);

  const resume = buildFinalResume(devTailorResponse().resume);
  for (const [company, job_title, status, daysAgo] of APPLICATIONS) {
    const applied_at = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from("applications")
      .insert({ user_id: userId, company, job_title, job_description: `${job_title} at ${company}.`, resume, applied_at })
      .select("id")
      .single();
    if (error) throw error;
    // Walk the status forward so the timeline has real history.
    const path = status === "rejected" ? ["received", "screening", "rejected"] : STATUSES.slice(1, STATUSES.indexOf(status) + 1);
    for (const s of path) await supabase.from("applications").update({ status: s }).eq("id", data.id);
  }
}
