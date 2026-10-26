import { ArrowLeft, Mail } from "lucide-react";
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

  // Newest first; the oldest entry is the application being saved.
  const events = [...app.events].reverse();

  return (
    <div className="rdb-page" style={{ maxWidth: 1200 }}>
      <Link href="/applications" className="rdb-crumb">
        <ArrowLeft className="rdb-icon" aria-hidden /> Tracker
      </Link>
      <div className="rdb-pagehead" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="rdb-h1">
            {app.job_title} <span className="rdb-muted">at {app.company}</span>
          </h1>
          <p className="rdb-lede" style={{ marginTop: 6 }}>
            Applied <LocalDate iso={app.applied_at} />
          </p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      <StatusPicker key={app.status} id={app.id} status={app.status} />

      <div className="grid items-start gap-6" style={{ gridTemplateColumns: "minmax(0, 380px) minmax(0, 1fr)", marginTop: 24 }}>
        <div>
          <section className="rdb-section">
            <h2 className="rdb-h3" style={{ marginBottom: 20 }}>
              Timeline
            </h2>
            <ol className="rdb-timeline">
              {events.map((e, i) => (
                <li key={e.id} className={i === 0 ? "now" : undefined}>
                  <StatusBadge status={e.status} />
                  {e.source === "email" && (
                    <span className="inline-flex items-center gap-1 align-middle" style={{ marginLeft: 4, padding: "0 8px", height: 22, borderRadius: 999, border: "1px solid var(--line)", fontSize: 12, color: "var(--ink-muted)" }}>
                      <Mail className="rdb-icon" width={13} height={13} aria-hidden /> From email
                    </span>
                  )}
                  <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: "20px" }}>
                    {e.email ? (
                      <>
                        “{e.email.subject || "(no subject)"}”<br />
                        <span className="rdb-muted" style={{ fontSize: 13 }} title={e.email.from_address}>
                          {e.email.from_name ?? e.email.from_address}
                        </span>
                      </>
                    ) : (
                      <span className="rdb-muted" style={{ fontSize: 13 }}>
                        {i === events.length - 1 ? "Application saved" : "Moved by you"}
                      </span>
                    )}
                  </p>
                  <time style={{ display: "block", marginTop: 4, fontSize: 12, color: "var(--ink-subtle)" }} dateTime={e.created_at}>
                    <LocalDate iso={e.created_at} withTime />
                  </time>
                </li>
              ))}
            </ol>
          </section>
          <section className="rdb-section">
            <details open>
              <summary className="rdb-h3" style={{ cursor: "pointer" }}>
                Job description
              </summary>
              <div className="rdb-muted" style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: "22px", marginTop: 12, maxHeight: 320, overflow: "auto" }}>
                {app.job_description}
              </div>
            </details>
          </section>
        </div>

        <div>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="rdb-h3">The resume you sent</h2>
              <p className="rdb-sub">
                Exactly as downloaded on <LocalDate iso={app.applied_at} />. Read-only.
              </p>
            </div>
            <RedownloadButtons resume={app.resume} />
          </div>
          <FrozenResume resume={app.resume} />
        </div>
      </div>
    </div>
  );
}
