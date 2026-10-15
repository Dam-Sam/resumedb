"use client";

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
  return (
    <section className="mt-8 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <h2 className="text-sm font-semibold">Suggested updates</h2>
      <p className="mt-0.5 text-sm text-gray-600">
        From emails that look like a status change, but not clearly enough to update on their own.
      </p>
      <ul className="mt-4 space-y-3">
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

  return (
    <li className="rounded-md border border-gray-200 bg-white p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/applications/${s.application.id}`} className="font-medium hover:underline">
            {s.application.company} <span className="font-normal text-gray-600">· {s.application.job_title}</span>
          </Link>
          <div className="mt-1.5 flex items-center gap-1.5">
            <StatusBadge status={s.application.status} />
            <span className="text-gray-400" aria-label="to">
              →
            </span>
            <StatusBadge status={s.proposed_status} />
          </div>
          <div className="mt-2 truncate text-gray-700" title={s.subject}>
            “{s.subject || "(no subject)"}”
          </div>
          <div className="text-xs text-gray-500">
            {s.from_name ? `${s.from_name} <${s.from_address}>` : s.from_address} · <LocalDate iso={s.received_at} withTime />
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            disabled={pending}
            onClick={() => answer("accept")}
            className="rounded-md bg-gray-900 px-3 py-1.5 font-medium text-white disabled:opacity-50"
          >
            Update to {STATUS_LABELS[s.proposed_status]}
          </button>
          <button
            disabled={pending}
            onClick={() => answer("dismiss")}
            className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-red-700">{error}</p>}
    </li>
  );
}
