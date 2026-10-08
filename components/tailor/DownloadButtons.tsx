"use client";

import { useState } from "react";
import { buildFinalResume, resumeFileName } from "@/lib/resume/final";
import type { TailoredResume } from "@/lib/resume/types";

// Both files are built in the browser from the current workspace state.
// The renderers are loaded only when clicked, so they don't slow down the page.
export default function DownloadButtons({ resume }: { resume: TailoredResume }) {
  const [busy, setBusy] = useState<"docx" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(ext: "docx" | "pdf") {
    setBusy(ext);
    setError(null);
    try {
      const final = buildFinalResume(resume);
      let blob: Blob;
      if (ext === "docx") {
        const [{ Packer }, { buildDocx }] = await Promise.all([import("docx"), import("@/lib/resume/docx")]);
        blob = await Packer.toBlob(buildDocx(final));
      } else {
        const [{ pdf }, { ResumePdf }] = await Promise.all([
          import("@react-pdf/renderer"),
          import("@/lib/resume/pdf"),
        ]);
        blob = await pdf(<ResumePdf resume={final} />).toBlob();
      }
      save(blob, resumeFileName(resume, ext));
    } catch (err) {
      console.error(err);
      setError("Couldn't create the file. Please try again.");
    }
    setBusy(null);
  }

  const button = "rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50";
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

function save(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
