import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import FrozenResume from "@/components/applications/FrozenResume";
import LocalDate from "@/components/applications/LocalDate";
import RedownloadButtons from "@/components/applications/RedownloadButtons";
import StatusBadge from "@/components/applications/StatusBadge";
import StatusPicker from "@/components/applications/StatusPicker";
import { getApplication } from "@/lib/applications/repository";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One application: where it stands, how it got there, and what you sent.
export default async function ApplicationPage({ params }: PageProps<"/applications/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // RLS returns nothing for someone else's application, so it's simply not found.
  const app = UUID.test(id) ? await getApplication(supabase, id) : null;
  if (!app) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-12">
      <Link href="/applications" className="text-sm text-gray-600 hover:text-gray-900">
        ← Tracker
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {app.job_title} <span className="font-normal text-gray-500">at {app.company}</span>
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Applied <LocalDate iso={app.applied_at} />
          </p>
        </div>
        <StatusPicker key={app.status} id={app.id} status={app.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
            <ol className="space-y-3 border-l border-gray-200 pl-4">
              {app.events.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-gray-400" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={e.status} />
                    {e.source === "email" && (
                      <span className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-600">From email</span>
                    )}
                  </div>
                  {e.email && (
                    <div className="mt-1 text-xs text-gray-600" title={e.email.from_address}>
                      “{e.email.subject || "(no subject)"}” · {e.email.from_name ?? e.email.from_address}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-500">
                    <LocalDate iso={e.created_at} withTime />
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Job description</h2>
            <p className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap text-sm text-gray-700">{app.job_description}</p>
          </section>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Resume you sent</h2>
            <RedownloadButtons resume={app.resume} />
          </div>
          <FrozenResume resume={app.resume} />
        </div>
      </div>
    </div>
  );
}
