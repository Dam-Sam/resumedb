import { redirect } from "next/navigation";
import ProfileView from "@/components/profile/ProfileView";
import { hasProfile } from "@/lib/profile/repository";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  // Step 2 needs the profile step 1 creates.
  if (!(await hasProfile(supabase, user.id))) redirect("/onboarding");

  return <ProfileView onboarding />;
}
