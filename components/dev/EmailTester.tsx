"use client";

import { useActionState, useState } from "react";
import { testEmail, type TestState } from "@/app/dev/email/actions";
import ErrorAlert from "@/components/ErrorAlert";
import { THRESHOLDS } from "@/lib/email/decide";

const OUTCOME_STYLES = {
  applied: "border-green-300 bg-green-50 text-green-900",
  suggested: "border-amber-300 bg-amber-50 text-amber-900",
  ignored: "border-gray-300 bg-gray-50 text-gray-800",
};

// "Applied" would read like the tracker's Applied status.
const OUTCOME_LABELS = {
  applied: "Status updated",
  suggested: "Suggested",
  ignored: "Ignored",
};

const input = "mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm";

export default function EmailTester({ applications }: { applications: Record<string, string> }) {
  const [state, action, pending] = useActionState<TestState, FormData>(testEmail, {});
  // Controlled, so the email stays in the form after a run (React resets uncontrolled fields).
  const [fields, setFields] = useState({ fromAddress: "", fromName: "", subject: "", text: "" });
  const bind = (name: keyof typeof fields) => ({
    name,
    value: fields[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields((f) => ({ ...f, [name]: e.target.value })),
  });
  const result = state.result;
  const c = result?.classification;

  return (
    <div className="mt-6 grid gap-6">
      <form action={action} className="grid gap-4 rounded-lg border border-gray-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Sender address
            <input {...bind("fromAddress")} type="email" required placeholder="no-reply@greenhouse.io" className={input} />
          </label>
          <label className="text-sm">
            Sender name
            <input {...bind("fromName")} placeholder="Stripe Recruiting" className={input} />
          </label>
        </div>
        <label className="text-sm">
          Subject
          <input {...bind("subject")} className={input} />
        </label>
        <label className="text-sm">
          Body
          <textarea {...bind("text")} required rows={10} className={input} />
        </label>
        <div className="flex items-center gap-3">
          <button
            name="apply"
            value="dry"
            disabled={pending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Dry run
          </button>
          <button
            name="apply"
            value="apply"
            disabled={pending}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Run and apply
          </button>
          {pending && <span className="text-sm text-gray-500">Asking Jev…</span>}
        </div>
      </form>

      {state.error && <ErrorAlert message={state.error} />}

      {result && (
        <div className="grid gap-4">
          <div className={`rounded-lg border p-4 text-sm ${OUTCOME_STYLES[result.decision.outcome]}`}>
            <div className="font-semibold">{result.duplicate ? "Duplicate" : OUTCOME_LABELS[result.decision.outcome]}</div>
            <div className="mt-1">{result.decision.reason}</div>
            {result.decision.applicationId && (
              <div className="mt-1 text-xs">{applications[result.decision.applicationId] ?? result.decision.applicationId}</div>
            )}
          </div>

          <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
            <h2 className="font-medium">Candidates (matched in code)</h2>
            {result.candidates.length ? (
              <ul className="mt-2 space-y-1">
                {result.candidates.map((cand) => (
                  <li key={cand.id}>
                    {cand.company} — {cand.job_title} <span className="text-gray-500">(by {cand.matchedBy})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-gray-600">None, so Jev wasn&apos;t asked.</p>
            )}
          </section>

          {c && (
            <section className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm">
              <Row
                label="About an application"
                value={c.raw.relevant}
                note={
                  c.raw.relevant >= THRESHOLDS.relevantToApply
                    ? `passed (≥ ${THRESHOLDS.relevantToApply})`
                    : c.raw.relevant >= THRESHOLDS.relevantToSuggest
                      ? `suggestion only (passed ≥ ${THRESHOLDS.relevantToSuggest}, not ≥ ${THRESHOLDS.relevantToApply})`
                      : `not passed (< ${THRESHOLDS.relevantToSuggest})`
                }
              />
              <Distribution
                title={`What happened: ${c.answers.kind.choice}`}
                confidence={c.answers.kind.confidence}
                probabilities={c.raw.kind}
              />
              <Distribution
                title="Which application"
                confidence={c.answers.application.confidence}
                probabilities={c.raw.application}
                labels={c.raw.applicationOptions}
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-56 shrink-0 truncate">{label}</span>
      <div className="h-2 flex-1 rounded bg-gray-100">
        <div className="h-2 rounded bg-gray-800" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="w-12 text-right tabular-nums">{value.toFixed(2)}</span>
      {note && <span className="text-xs text-gray-500">{note}</span>}
    </div>
  );
}

function Distribution({
  title,
  confidence,
  probabilities,
  labels,
}: {
  title: string;
  confidence: number;
  probabilities: Record<string, number>;
  labels?: Record<string, string>;
}) {
  return (
    <div>
      <h3 className="font-medium">
        {title}{" "}
        <span className="font-normal text-gray-500">
          confidence {confidence.toFixed(2)}:{" "}
          {confidence >= THRESHOLDS.confidenceToApply ? "passed" : "not passed"} (≥ {THRESHOLDS.confidenceToApply})
        </span>
      </h3>
      <div className="mt-2 grid gap-1">
        {Object.entries(probabilities)
          .sort(([, a], [, b]) => b - a)
          .map(([key, p]) => (
            <Row key={key} label={labels?.[key] ?? key} value={p} />
          ))}
      </div>
    </div>
  );
}
