"use client";

import { useState } from "react";
import ErrorAlert from "@/components/ErrorAlert";
import LoadingBar from "@/components/LoadingBar";
import TailorForm from "@/components/tailor/TailorForm";
import Workspace from "@/components/tailor/Workspace";
import type { TailorInput, TailorResponse } from "@/lib/resume/types";

type View =
  | { kind: "form"; error?: string }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "workspace"; data: TailorResponse };

const EMPTY: TailorInput = { company: "", jobTitle: "", jobDescription: "", includeSummary: false };

// The form, then the workspace. Nothing here is saved: leaving the page drops it.
export default function Tailor() {
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
      // Missing input goes back to the form; anything else offers Retry.
      if (res.status === 400) return setView({ kind: "form", error: body.error });
      setView({ kind: "error", message: body.error ?? "Something went wrong while tailoring." });
    } catch {
      setView({ kind: "error", message: "Something went wrong while tailoring." });
    }
  }

  if (view.kind === "workspace") {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Workspace data={view.data} onStartOver={() => setView({ kind: "form" })} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Tailor your resume</h1>
      <p className="mt-2 text-gray-600">
        Paste a job posting. We&apos;ll reorder your experience for it and put an AI rewrite beside every
        bullet. You decide what stays.
      </p>
      <div className="mt-8">
        {view.kind === "loading" && (
          <LoadingBar label="Tailoring your resume… this can take up to a minute." />
        )}
        {view.kind === "error" && <ErrorAlert message={view.message} onRetry={run} />}
        {view.kind === "form" && (
          <div className="space-y-4">
            {view.error && <ErrorAlert message={view.error} />}
            <TailorForm value={input} onChange={setInput} onSubmit={run} />
          </div>
        )}
      </div>
    </div>
  );
}
