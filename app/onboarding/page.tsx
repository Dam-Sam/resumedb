import { redirect } from "next/navigation";
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
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Set up your profile</h1>
      <p className="mt-3 text-gray-600">
        Upload your resume once. We&apos;ll read it into your profile, and you can fix anything we got
        wrong on the next page.
      </p>
      <OnboardingForm />
    </div>
  );
}
