"use client";

import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import LoadingBar from "@/components/LoadingBar";

type Mode = "add" | "replace";

const CHOICES: { mode: Mode; title: string; text: string }[] = [
  { mode: "add", title: "Add to my profile", text: "Keep what's here and add the resume's entries and skills." },
  { mode: "replace", title: "Replace my profile", text: "Delete current entries, skills and contact info first. We'll ask before deleting." },
];

// Re-import a resume onto an existing profile, either appending to it or replacing it.
export default function ImportResume() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("add");
  const [fileName, setFileName] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const form = formRef.current;
    if (!form) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-resume", { method: "POST", body: new FormData(form) });
      const body = await res.json();
      if (body.ok) {
        form.reset();
        setFileName(null);
        router.refresh();
      } else if (body.unreadable) {
        setError("We couldn't read that resume. Your profile was left unchanged.");
      } else {
        setError(body.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "replace") setConfirming(true);
    else run();
  }

  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <div className="pf-import">
        <label
          className="rdb-dropzone"
          style={{ padding: 20 }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && fileRef.current) {
              const dt = new DataTransfer();
              dt.items.add(file);
              fileRef.current.files = dt.files;
              setFileName(file.name);
            }
          }}
        >
          <FileUp className="rdb-icon" width={24} height={24} aria-hidden />
          {fileName ? (
            <div>
              <b>{fileName}</b>
            </div>
          ) : (
            <div>
              <b>Drop a resume</b> or <span className="rdb-link">choose a file</span>
            </div>
          )}
          <div className="rdb-small rdb-muted">PDF or .docx, up to 4 MB</div>
          <input
            ref={fileRef}
            type="file"
            name="resume"
            required
            className="sr-only"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }} role="radiogroup" aria-label="What to do with your current profile">
          {CHOICES.map((c) => (
            <div
              key={c.mode}
              className="rdb-choice"
              role="radio"
              tabIndex={0}
              aria-checked={mode === c.mode}
              onClick={() => setMode(c.mode)}
              onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), setMode(c.mode))}
            >
              <span className="rdb-choice__dot" />
              <div>
                <b>{c.title}</b>
                <div className="rdb-small rdb-muted">{c.text}</div>
              </div>
            </div>
          ))}
          <input type="hidden" name="mode" value={mode} />
          {busy ? (
            <LoadingBar label="Reading your resume… this can take up to a minute." />
          ) : (
            <div>
              <button className="rdb-btn rdb-btn--secondary rdb-btn--sm" style={{ marginTop: 4 }}>
                Import resume
              </button>
            </div>
          )}
          {error && <p className="pf-error" role="alert" style={{ margin: 0 }}>{error}</p>}
        </div>
      </div>

      {confirming && (
        <div className="pf-scrim" onClick={() => setConfirming(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="replace-profile" className="rdb-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 id="replace-profile" className="rdb-h2">
              Replace your profile?
            </h2>
            <p className="rdb-muted">
              Your current entries, skills and contact info will be deleted and rebuilt from the new resume. Applications on your Tracker are not affected.
            </p>
            <div className="rdb-actions" style={{ justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" className="rdb-btn rdb-btn--secondary" onClick={() => setConfirming(false)} autoFocus>
                Cancel
              </button>
              <button
                type="button"
                className="rdb-btn rdb-btn--danger"
                onClick={() => {
                  setConfirming(false);
                  run();
                }}
              >
                Replace profile
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
