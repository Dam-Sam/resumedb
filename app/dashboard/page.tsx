import Link from "next/link";
import { redirect } from "next/navigation";
import DaysSince from "@/components/applications/DaysSince";
import StatusBadge from "@/components/applications/StatusBadge";
import Greeting from "@/components/dashboard/Greeting";
import RibbonChart from "@/components/dashboard/RibbonChart";
import { listDashboardApplications, listStatusHistory, STATUSES, type DashboardApplication } from "@/lib/applications/repository";
import { weeklySnapshots } from "@/lib/applications/weekly";
import { createClient } from "@/lib/supabase/server";

// Cards shown per status column; the rest are on the Tracker.
const CARDS_PER_COLUMN = 2;

// Where every application on the Tracker stands right now: a greeting, a few totals,
// the weekly ribbon chart, then one column per status.
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [applications, history, contact] = await Promise.all([
    listDashboardApplications(supabase, user.id),
    listStatusHistory(supabase, user.id),
    supabase.from("contact_info").select("full_name").eq("user_id", user.id).maybeSingle(),
  ]);
  const firstName = contact.data?.full_name?.trim().split(/\s+/)[0] || null;

  const count = (pred: (a: DashboardApplication) => boolean) => applications.filter(pred).length;
  const total = applications.length;
  const active = count((a) => a.status !== "offer" && a.status !== "rejected");
  // Any reply at all, including "we received your application".
  const heardBack = count((a) => a.status !== "applied");
  const offers = count((a) => a.status === "offer");
  const since = applications.map((a) => a.applied_at).sort()[0];

  // Most recently changed first within each column.
  const lastChange = (a: DashboardApplication) => a.last_event?.created_at ?? a.applied_at;
  const byStatus = STATUSES.map((status) => ({
    status,
    apps: applications.filter((a) => a.status === status).sort((a, b) => lastChange(b).localeCompare(lastChange(a))),
  }));

  return (
    <main className="rdb-page" style={{ maxWidth: 1200 }}>
      <section className="db-hello">
        <Greeting name={firstName} />
        <p>
          {total === 0 ? (
            "Nothing on your Tracker yet."
          ) : (
            <>
              <b>
                {active} {active === 1 ? "application" : "applications"}
              </b>{" "}
              {active === 1 ? "is" : "are"} still in progress. You&apos;ve heard back on {Math.round((heardBack / total) * 100)}%.
            </>
          )}
        </p>
      </section>

      {total === 0 ? (
        <div className="rdb-notice rdb-notice--info">
          <div>
            No applications yet.{" "}
            <Link href="/tailor" className="rdb-link">
              Tailor a resume
            </Link>{" "}
            and download it to add one.
          </div>
        </div>
      ) : (
        <>
          <dl className="rdb-stats" style={{ marginBottom: 24 }}>
            <Stat label="Applications" value={total} note={since ? `since ${formatDay(since)}` : undefined} />
            <Stat label="Still in progress" value={active} note="not yet an offer or closed" />
            <Stat label="Heard back" value={heardBack} note={`${Math.round((heardBack / total) * 100)}% of applications`} />
            <Stat label="Offers" value={offers} />
          </dl>

          <RibbonChart data={weeklySnapshots(history)} />

          <section className="db-board-wrap">
            <div className="rdb-section__head">
              <div>
                <h2 className="rdb-h2">By status</h2>
                <p className="rdb-sub">Most recently changed first.</p>
              </div>
              <Link className="rdb-link rdb-small" href="/applications">
                Open Tracker
              </Link>
            </div>
            <div className="db-board">
              {byStatus.map(({ status, apps }) => (
                <section key={status} className="db-col">
                  <h3>
                    <StatusBadge status={status} />
                    <span>{apps.length}</span>
                  </h3>
                  {apps.length === 0 && <p className="db-none">None</p>}
                  {apps.slice(0, CARDS_PER_COLUMN).map((a) => (
                    <Card key={a.id} app={a} />
                  ))}
                  {apps.length > CARDS_PER_COLUMN && (
                    <Link className="db-more" href="/applications">
                      and {apps.length - CARDS_PER_COLUMN} more
                    </Link>
                  )}
                </section>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rdb-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {note && <dd className="note">{note}</dd>}
    </div>
  );
}

function Card({ app }: { app: DashboardApplication }) {
  return (
    <Link href={`/applications/${app.id}`} className="db-card">
      <b title={app.company}>{app.company}</b>
      <span title={app.job_title}>{app.job_title}</span>
      <small>
        {app.last_event ? (
          <>
            {app.last_event.source === "email" ? "From email" : "Updated"} · <DaysSince iso={app.last_event.created_at} />
          </>
        ) : (
          <>
            Applied <DaysSince iso={app.applied_at} />
          </>
        )}
      </small>
    </Link>
  );
}
