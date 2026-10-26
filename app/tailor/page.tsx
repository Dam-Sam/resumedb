import { redirect } from "next/navigation";
import TailorFlow from "@/components/tailor/TailorFlow";
import { listRecentApplications } from "@/lib/applications/repository";
import { createClient } from "@/lib/supabase/server";

export default async function TailorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const recent = await listRecentApplications(supabase, user.id, 3);
  return <TailorFlow recent={recent} />;
}
