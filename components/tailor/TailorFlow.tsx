"use client";

import Link from "next/link";
import { useState } from "react";
import ErrorAlert from "@/components/ErrorAlert";
import DaysSince from "@/components/applications/DaysSince";
import OnboardingSteps from "@/components/onboarding/OnboardingSteps";
import TailorForm from "@/components/tailor/TailorForm";
import Workspace from "@/components/tailor/Workspace";
import type { ApplicationRow } from "@/lib/applications/repository";
import type { TailorInput, TailorResponse } from "@/lib/resume/types";

type View =
  | { kind: "form"; error?: string }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "workspace"; data: TailorResponse };

const EMPTY: TailorInput = { company: "", jobTitle: "", jobDescription: "", includeSummary: false };

const STEPS = [
  ["We reorder.", "Your most relevant experience and projects move up; skills are sorted by what the posting asks for."],
  ["We suggest rewrites.", "Each bullet gets a version aimed at this job, describing the same real work."],
  ["You choose.", "Keep yours or take the rewrite, bullet by bullet. Nothing is added that isn't in your profile."],
  ["You download.", "Word or PDF, and the application is saved to your Tracker."],
];

// The form, then the workspace. The workspace isn't saved; downloads go to the Tracker.
// With `onboarding` it is step 3 of setup: the steps show above, and there's a way to skip to the dashboard.
export default function TailorFlow({ recent, onboarding = false }: { recent: ApplicationRow[]; onboarding?: boolean }) {
  const [input, setInput] = useState<TailorInput>(EMPTY);
  const [view, setView] = useState<View>({ kind: "form" });

  async function run() {
    setView({ kind: "loading" });
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await res.json();
      if (res.ok) return setView({ kind: "workspace", data: body });
      // Missing input goes back to the form; anything else offers Try again.
      if (res.status === 400) return setView({ kind: "form", error: body.error });
      setView({ kind: "error", message: body.error ?? "We couldn't finish tailoring." });
    } catch {
      setView({ kind: "error", message: "We couldn't finish tailoring." });
    }
  }

  if (view.kind === "workspace") {
    return <Workspace data={view.data} jobDescription={input.jobDescription} onStartOver={() => setView({ kind: "form" })} />;
  }

  return (
    <div className="rdb-page" style={{ maxWidth: 1120 }}>
      <div className="tf-cols">
        <div>
          {onboarding && <OnboardingSteps current={2} />}
          <h1 className="rdb-h1">{onboarding ? "Tailor your first resume" : "Tailor your resume"}</h1>
          <p className="rdb-lede">
            Paste a job posting. We&apos;ll reorder your experience for it and put a rewrite beside every bullet. You decide what stays.
          </p>

          {view.kind === "loading" && (
            <div className="rdb-section" style={{ marginTop: 28 }} role="status" aria-live="polite">
              <h2 className="rdb-h2">
                Tailoring for {input.jobTitle} at {input.company}
              </h2>
              <p className="rdb-muted" style={{ margin: "6px 0 16px" }}>
                Matching your experience to the posting… this takes about a minute.
              </p>
              <div className="rdb-progress" />
              <ul className="rdb-small rdb-muted" style={{ margin: "16px 0 0", paddingLeft: 18, listStyle: "disc" }}>
                <li>Reading what the posting asks for</li>
                <li>Ordering your experience and skills</li>
                <li>Writing a rewrite for each bullet</li>
              </ul>
            </div>
          )}
          {view.kind === "error" && (
            <div style={{ marginTop: 28 }}>
              <div role="alert" className="rdb-notice rdb-notice--error" style={{ alignItems: "center", maxWidth: 680 }}>
                <div style={{ flex: 1 }}>
                  <strong>We couldn&apos;t finish tailoring.</strong> Your posting is still here.
                  {view.message !== "We couldn't finish tailoring." && <> {view.message}</>}
                </div>
                <button onClick={run} className="rdb-btn rdb-btn--secondary rdb-btn--sm">
                  Try again
                </button>
              </div>
            </div>
          )}
          {view.kind === "form" && (
            <>
              {view.error && (
                <div style={{ marginTop: 28 }}>
                  <ErrorAlert message={view.error} />
                </div>
              )}
              <TailorForm value={input} onChange={setInput} onSubmit={run} />
              {onboarding && (
                <p style={{ marginTop: 20 }}>
                  <Link href="/dashboard" className="rdb-link">
                    Skip for now
                  </Link>
                </p>
              )}
            </>
          )}
        </div>

        <aside className="tf-what">
          <h2 className="rdb-h3">What happens next</h2>
          <ol>
            {STEPS.map(([lead, rest]) => (
              <li key={lead}>
                <b>{lead}</b> {rest}
              </li>
            ))}
          </ol>
          {recent.length > 0 && (
            <div className="tf-recent">
              <p className="rdb-eyebrow">Recently tailored</p>
              {recent.map((a) => (
                <Link key={a.id} href={`/applications/${a.id}`}>
                  {a.job_title}{" "}
                  <span>
                    {a.company} · <DaysSince iso={a.applied_at} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
