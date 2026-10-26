"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { saveApplication } from "@/app/applications/actions";
import { buildResumeFile, saveFile } from "@/lib/resume/files";
import { buildFinalResume, resumeFileName } from "@/lib/resume/final";
import type { TailoredResume } from "@/lib/resume/types";

export type DownloadNotice = { kind: "error" | "attention"; text: React.ReactNode } | null;

// Both files are built in the browser from the current workspace state.
// Every download also saves the application to the Tracker: the first one
// creates it, later ones from this workspace overwrite its frozen resume.
export default function DownloadButtons({
  resume,
  jobDescription,
  onNotice,
}: {
  resume: TailoredResume;
  jobDescription: string;
  onNotice: (n: DownloadNotice) => void;
}) {
  const [busy, setBusy] = useState<"docx" | "pdf" | null>(null);
  const [applicationId, setApplicationId] = useState<string | undefined>();
  const [trackerFailed, setTrackerFailed] = useState(false);

  async function download(ext: "docx" | "pdf") {
    setBusy(ext);
    onNotice(null);
    const final = buildFinalResume(resume);
    try {
      const blob = await buildResumeFile(final, ext);
      saveFile(blob, resumeFileName(final.name, ext));
    } catch (err) {
      console.error(err);
      onNotice({ kind: "error", text: <><strong>We couldn&apos;t create the file.</strong> Your changes are still here; try again.</> });
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
    if (saved.id) {
      setApplicationId(saved.id);
      setTrackerFailed(false);
    } else {
      setTrackerFailed(true);
      onNotice({
        kind: "attention",
        text: (
          <>
            <strong>Your {ext === "pdf" ? "PDF" : "Word file"} downloaded,</strong> but we couldn&apos;t add it to your Tracker. Download again to retry.
          </>
        ),
      });
    }
    setBusy(null);
  }

  return (
    <div className="rdb-actions">
      {!trackerFailed && applicationId && <span className="rdb-save">Saved to Tracker</span>}
      <button onClick={() => download("docx")} disabled={busy !== null} className="rdb-btn rdb-btn--secondary rdb-btn--sm">
        <Download className="rdb-icon" aria-hidden /> {busy === "docx" ? "Creating…" : "Word"}
      </button>
      <button onClick={() => download("pdf")} disabled={busy !== null} className="rdb-btn rdb-btn--primary rdb-btn--sm">
        <Download className="rdb-icon rdb-icon-on-primary" aria-hidden /> {busy === "pdf" ? "Creating…" : "PDF"}
      </button>
    </div>
  );
}
