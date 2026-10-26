"use client";

import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { answerSuggestion } from "@/app/applications/actions";
import LocalDate from "@/components/applications/LocalDate";
import StatusBadge from "@/components/applications/StatusBadge";
import { STATUS_LABELS } from "@/lib/applications/repository";
import type { Suggestion } from "@/lib/email/suggestions";

// Emails that look like a status change, but not certainly enough to apply
// automatically. One click updates the status or sets the email aside.
export default function Suggestions({ suggestions }: { suggestions: Suggestion[] }) {
  if (!suggestions.length) return null;
  const n = suggestions.length;
  return (
    <section
      className="rdb-section"
      style={{ marginBottom: "var(--space-8)", boxShadow: "inset 3px 0 0 var(--clay)", paddingBottom: "var(--space-2)" }}
    >
      <div className="flex items-start gap-3" style={{ color: "var(--clay-ink)" }}>
        <Mail className="rdb-icon" width={18} height={18} aria-hidden />
        <div>
          <h2 className="rdb-h3">
            {n} update{n === 1 ? "" : "s"} from your inbox
          </h2>
          <p className="rdb-sub">These emails look like a status change, but not clearly enough to apply on their own.</p>
        </div>
      </div>
      <ul style={{ listStyle: "none", margin: "var(--space-3) 0 0", padding: 0 }}>
        {suggestions.map((s) => (
          <SuggestionRow key={s.id} suggestion={s} />
        ))}
      </ul>
    </section>
  );
}

function SuggestionRow({ suggestion: s }: { suggestion: Suggestion }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const answer = (choice: "accept" | "dismiss") =>
    startTransition(async () => {
      setError(null);
      const result = await answerSuggestion(s.id, choice);
      if (result.error) setError(result.error);
    });
  // Moving forward is the main action; moving to Closed is deliberately quieter.
  const toClosed = s.proposed_status === "rejected";

  return (
    <li style={{ padding: "var(--space-4) 0", borderTop: "1px solid var(--line)" }}>
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <Link href={`/applications/${s.application.id}`} className="rdb-co" style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "none" }}>
            {s.application.company}{" "}
            <span style={{ color: "var(--ink-muted)", fontWeight: 400 }}>· {s.application.job_title}</span>
          </Link>
          <div className="my-2 flex items-center gap-2" style={{ color: "var(--ink-subtle)" }}>
            <StatusBadge status={s.application.status} />
            <ArrowRight className="rdb-icon" width={14} height={14} aria-label="to" />
            <StatusBadge status={s.proposed_status} />
          </div>
          <p className="truncate" style={{ margin: 0, fontSize: 14 }} title={s.subject}>
            “{s.subject || "(no subject)"}”{" "}
            <span style={{ color: "var(--ink-subtle)", fontSize: 13 }}>
              · {s.from_name ? `${s.from_name} <${s.from_address}>` : s.from_address} · <LocalDate iso={s.received_at} withTime />
            </span>
          </p>
        </div>
        <div className="rdb-actions">
          <button
            disabled={pending}
            onClick={() => answer("accept")}
            className={`rdb-btn rdb-btn--sm ${toClosed ? "rdb-btn--secondary" : "rdb-btn--primary"}`}
          >
            Move to {STATUS_LABELS[s.proposed_status]}
          </button>
          <button disabled={pending} onClick={() => answer("dismiss")} className="rdb-btn rdb-btn--quiet rdb-btn--sm">
            Not this
          </button>
        </div>
      </div>
      {error && (
        <div className="rdb-notice rdb-notice--error" role="alert" style={{ marginTop: "var(--space-3)" }}>
          <div>{error}</div>
        </div>
      )}
    </li>
  );
}
