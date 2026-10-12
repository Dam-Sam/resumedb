"use client";

import { useState } from "react";
import { buildResumeFile, saveFile } from "@/lib/resume/files";
import { resumeFileName, type FinalResume } from "@/lib/resume/final";

// Rebuilds the file from the frozen copy, so it's the same resume you sent.
export default function RedownloadButtons({
  resume,
  company,
  jobTitle,
}: {
  resume: FinalResume;
  company: string;
  jobTitle: string;
}) {
  const [busy, setBusy] = useState<"docx" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(ext: "docx" | "pdf") {
    setBusy(ext);
    setError(null);
    try {
      saveFile(await buildResumeFile(resume, ext), resumeFileName(resume.name, company, jobTitle, ext));
    } catch (err) {
      console.error(err);
      setError("Couldn't create the file. Please try again.");
    }
    setBusy(null);
  }

  const button = "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50";
  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-sm text-red-700">{error}</span>}
      <button onClick={() => download("docx")} disabled={busy !== null} className={button}>
        {busy === "docx" ? "Creating…" : "Download Word"}
      </button>
      <button onClick={() => download("pdf")} disabled={busy !== null} className={button}>
        {busy === "pdf" ? "Creating…" : "Download PDF"}
      </button>
    </div>
  );
}
