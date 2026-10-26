import { Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import Suggestions from "@/components/applications/Suggestions";
import TrackerTable from "@/components/applications/TrackerTable";
import { listDashboardApplications } from "@/lib/applications/repository";
import { listSuggestions } from "@/lib/email/suggestions";
import { createClient } from "@/lib/supabase/server";

// Every application, newest first. Applications come from downloads on Tailor.
export default async function TrackerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [applications, suggestions] = await Promise.all([
    listDashboardApplications(supabase, user.id),
    listSuggestions(supabase, user.id),
  ]);

  return (
    <div className="rdb-page" style={{ maxWidth: 1120 }}>
      <div className="rdb-pagehead">
        <div>
          <h1 className="rdb-h1">Tracker</h1>
          <p className="rdb-lede">Every resume you download, or an agent applies with, is saved here with the job it was for.</p>
        </div>
        <Link href="/tailor" className="rdb-btn rdb-btn--primary">
          <Sparkles className="rdb-icon" aria-hidden /> Tailor a resume
        </Link>
      </div>

      <Suggestions suggestions={suggestions} />

      {applications.length === 0 ? (
        <section className="rdb-section">
          <div className="rdb-empty">
            <svg width="96" height="96" viewBox="0 0 64 64" aria-hidden="true">
              <rect className="sheet-back" x="20" y="6" width="36" height="44" rx="9" />
              <rect className="sheet-front" x="8" y="14" width="36" height="44" rx="9" />
              <rect className="sheet-line" x="15" y="25" width="20" height="4.5" rx="2.25" />
              <rect className="sheet-tailored" x="15" y="34" width="22" height="4.5" rx="2.25" />
              <rect className="sheet-line" x="15" y="43" width="14" height="4.5" rx="2.25" />
            </svg>
            <h3>No applications yet</h3>
            <p>Tailor a resume and download it, or let an agent apply for you. Each one shows up here.</p>
            <Link href="/tailor" className="rdb-btn rdb-btn--primary">
              Tailor a resume
            </Link>
          </div>
        </section>
      ) : (
        <TrackerTable applications={applications} />
      )}
    </div>
  );
}
