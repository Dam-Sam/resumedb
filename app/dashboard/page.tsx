import Link from "next/link";
import { redirect } from "next/navigation";
import DaysSince from "@/components/applications/DaysSince";
import LocalDate from "@/components/applications/LocalDate";
import StatusBadge from "@/components/applications/StatusBadge";
import { listDashboardApplications, STATUSES, type DashboardApplication } from "@/lib/applications/repository";
import { createClient } from "@/lib/supabase/server";

// Where every application on the Tracker stands right now: a few totals, then
// one column per status.
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const applications = await listDashboardApplications(supabase, user.id);

  const count = (pred: (a: DashboardApplication) => boolean) => applications.filter(pred).length;
  const total = applications.length;
  const active = count((a) => a.status !== "offer" && a.status !== "rejected");
  // Any reply at all, including "we received your application".
  const heardBack = count((a) => a.status !== "applied");
  const offers = count((a) => a.status === "offer");

  // Most recently changed first within each column.
  const lastChange = (a: DashboardApplication) => a.last_event?.created_at ?? a.applied_at;
  const byStatus = STATUSES.map((status) => ({
    status,
    apps: applications.filter((a) => a.status === status).sort((a, b) => lastChange(b).localeCompare(lastChange(a))),
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">Where each application on your Tracker stands right now.</p>

      {total === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
          No applications yet.{" "}
          <Link href="/tailor" className="font-medium text-gray-900 underline">
            Tailor a resume
          </Link>{" "}
          and download it to add one.
        </div>
      ) : (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Applications" value={total} />
            <Stat label="Still in progress" value={active} />
            <Stat label="Heard back" value={heardBack} note={`${Math.round((heardBack / total) * 100)}% of applications`} />
            <Stat label="Offers" value={offers} />
          </dl>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {byStatus.map(({ status, apps }) => (
              <section key={status} className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
                <h2 className="flex items-center justify-between">
                  <StatusBadge status={status} />
                  <span className="text-sm text-gray-500">{apps.length}</span>
                </h2>
                {apps.length === 0 ? (
                  <p className="mt-3 text-xs text-gray-400">None</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {apps.map((a) => (
                      <li key={a.id}>
                        <Card app={a} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
      {note && <dd className="text-xs text-gray-500">{note}</dd>}
    </div>
  );
}

function Card({ app }: { app: DashboardApplication }) {
  return (
    <Link
      href={`/applications/${app.id}`}
      className="block rounded-md border border-gray-200 bg-white p-3 text-sm hover:border-gray-300 hover:shadow-sm"
    >
      <div className="truncate font-medium" title={app.company}>
        {app.company}
      </div>
      <div className="line-clamp-2 text-gray-600" title={app.job_title}>
        {app.job_title}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Applied <LocalDate iso={app.applied_at} />
      </div>
      {app.last_event && (
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-gray-500">
          <span>
            Updated <DaysSince iso={app.last_event.created_at} />
          </span>
          {app.last_event.source === "email" && (
            <span className="rounded-full border border-gray-200 px-1.5 text-[11px] text-gray-600">From email</span>
          )}
        </div>
      )}
    </Link>
  );
}
