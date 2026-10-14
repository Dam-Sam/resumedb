"use client";

import { useState } from "react";
import { saveApplication } from "@/app/applications/actions";
import { buildResumeFile, saveFile } from "@/lib/resume/files";
import { buildFinalResume, resumeFileName } from "@/lib/resume/final";
import type { TailoredResume } from "@/lib/resume/types";

// Both files are built in the browser from the current workspace state.
// Every download also saves the application to the Tracker: the first one
// creates it, later ones from this workspace overwrite its frozen resume.
export default function DownloadButtons({ resume, jobDescription }: { resume: TailoredResume; jobDescription: string }) {
  const [busy, setBusy] = useState<"docx" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | undefined>();

  async function download(ext: "docx" | "pdf") {
    setBusy(ext);
    setError(null);
    const final = buildFinalResume(resume);
    try {
      const blob = await buildResumeFile(final, ext);
      saveFile(blob, resumeFileName(final.name, ext));
    } catch (err) {
      console.error(err);
      setError("Couldn't create the file. Please try again.");
      setBusy(null);
      return;
    }
    // Only saved once the file was actually created.
    const saved = await saveApplication({
      id: applicationId,
      company: resume.company,
      jobTitle: resume.jobTitle,
      jobDescription,
      resume: final,
    }).catch(() => ({ id: undefined, error: "failed" }));
    if (saved.id) setApplicationId(saved.id);
    else setError("Downloaded, but couldn't save to your Tracker.");
    setBusy(null);
  }

  const button = "rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50";
  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-sm text-red-700">{error}</span>}
      {!error && applicationId && <span className="text-sm text-gray-500">Saved to Tracker</span>}
      <button onClick={() => download("docx")} disabled={busy !== null} className={button}>
        {busy === "docx" ? "Creating…" : "Download Word"}
      </button>
      <button onClick={() => download("pdf")} disabled={busy !== null} className={button}>
        {busy === "pdf" ? "Creating…" : "Download PDF"}
      </button>
    </div>
  );
}
