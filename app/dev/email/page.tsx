import { notFound, redirect } from "next/navigation";
import StatusBadge from "@/components/applications/StatusBadge";
import EmailTester from "@/components/dev/EmailTester";
import { listOpenApplications } from "@/lib/applications/repository";
import { createClient } from "@/lib/supabase/server";

// Development only: paste an email and see what the tracker would do with it.
export default async function EmailTestPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const open = await listOpenApplications(supabase, user.id);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Email classifier test</h1>
      <p className="mt-1 text-sm text-gray-600">
        Paste an email from a recruiter or employer to see how Jev reads it against your open applications.
      </p>

      <details className="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <summary className="cursor-pointer font-medium">Your open applications ({open.length})</summary>
        <ul className="mt-3 space-y-1">
          {open.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              <span>
                {a.company} — {a.job_title}
              </span>
              <StatusBadge status={a.status} />
            </li>
          ))}
        </ul>
      </details>

      <EmailTester applications={Object.fromEntries(open.map((a) => [a.id, `${a.company} — ${a.job_title}`]))} />
    </div>
  );
}
