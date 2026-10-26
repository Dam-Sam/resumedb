import { redirect } from "next/navigation";
import OnboardingSteps from "@/components/onboarding/OnboardingSteps";
import OnboardingForm from "@/components/OnboardingForm";
import { hasProfile } from "@/lib/profile/repository";
import { createClient } from "@/lib/supabase/server";

export default async function Onboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Onboarding is first-time only; after that the profile is edited on /profile.
  if (user && (await hasProfile(supabase, user.id))) redirect("/profile");

  return (
    <div className="rdb-page rdb-page--narrow">
      <OnboardingSteps current={0} />
      <h1 className="rdb-h1">Let&apos;s set up your profile.</h1>
      <p className="rdb-lede">
        Upload your resume once. We&apos;ll read it into your profile, and you
        can fix anything we got wrong in the next step.
      </p>
      <OnboardingForm />
    </div>
  );
}
