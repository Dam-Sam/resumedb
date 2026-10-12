import Link from "next/link";
import { redirect } from "next/navigation";
import LocalDate from "@/components/applications/LocalDate";
import StatusBadge from "@/components/applications/StatusBadge";
import { listApplications } from "@/lib/applications/repository";
import { createClient } from "@/lib/supabase/server";

// Every application, newest first. Applications come from downloads on Tailoring.
export default async function TrackerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const applications = await listApplications(supabase, user.id);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Tracker</h1>
      <p className="mt-1 text-sm text-gray-600">
        Every resume you download is saved here with the job it was for.
      </p>

      {applications.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
          No applications yet.{" "}
          <Link href="/tailor" className="font-medium text-gray-900 underline">
            Tailor a resume
          </Link>{" "}
          and download it to add one.
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Date applied</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applications.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{a.company}</td>
                  <td className="px-4 py-3">{a.job_title}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <LocalDate iso={a.applied_at} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
