import { redirect } from "next/navigation";
import TailorFlow from "@/components/tailor/TailorFlow";
import { hasProfile } from "@/lib/profile/repository";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingTailor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  if (!(await hasProfile(supabase, user.id))) redirect("/onboarding");

  return <TailorFlow recent={[]} onboarding />;
}
