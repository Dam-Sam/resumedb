"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { buildResumeFile, saveFile } from "@/lib/resume/files";
import { resumeFileName, type FinalResume } from "@/lib/resume/final";

// Rebuilds the file from the frozen copy, so it's the same resume you sent.
export default function RedownloadButtons({ resume }: { resume: FinalResume }) {
  const [busy, setBusy] = useState<"docx" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(ext: "docx" | "pdf") {
    setBusy(ext);
    setError(null);
    try {
      saveFile(await buildResumeFile(resume, ext), resumeFileName(resume.name, ext));
    } catch (err) {
      console.error(err);
      setError("We couldn't create the file. Try again.");
    }
    setBusy(null);
  }

  return (
    <div className="rdb-actions">
      {error && (
        <span role="alert" style={{ color: "var(--danger)", fontSize: 13 }}>
          {error}
        </span>
      )}
      <button onClick={() => download("docx")} disabled={busy !== null} className="rdb-btn rdb-btn--secondary rdb-btn--sm">
        <Download className="rdb-icon" aria-hidden /> {busy === "docx" ? "Creating…" : "Word"}
      </button>
      <button onClick={() => download("pdf")} disabled={busy !== null} className="rdb-btn rdb-btn--secondary rdb-btn--sm">
        <Download className="rdb-icon" aria-hidden /> {busy === "pdf" ? "Creating…" : "PDF"}
      </button>
    </div>
  );
}
