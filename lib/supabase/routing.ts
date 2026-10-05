import type { SupabaseClient } from "@supabase/supabase-js";

// Where a signed-in user belongs: onboarding until they have a profile, then tailoring.
export async function homeFor(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("contact_info")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? "/tailor" : "/onboarding";
}
