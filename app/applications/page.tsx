import Link from "next/link";
import { redirect } from "next/navigation";
import Suggestions from "@/components/applications/Suggestions";
import TrackerTable from "@/components/applications/TrackerTable";
import { listApplications } from "@/lib/applications/repository";
import { listSuggestions } from "@/lib/email/suggestions";
import { createClient } from "@/lib/supabase/server";

// Every application, newest first. Applications come from downloads on Tailoring.
export default async function TrackerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [applications, suggestions] = await Promise.all([
    listApplications(supabase, user.id),
    listSuggestions(supabase, user.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Tracker</h1>
      <p className="mt-1 text-sm text-gray-600">
        Every resume you download is saved here with the job it was for.
      </p>

      <Suggestions suggestions={suggestions} />

      {applications.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
          No applications yet.{" "}
          <Link href="/tailor" className="font-medium text-gray-900 underline">
            Tailor a resume
          </Link>{" "}
          and download it to add one.
        </div>
      ) : (
        <TrackerTable applications={applications} />
      )}
    </div>
  );
}
