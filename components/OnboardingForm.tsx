"use client";

import { FileText, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import ErrorAlert from "@/components/ErrorAlert";

const MAX_BYTES = 4 * 1024 * 1024;

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function OnboardingForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | null) {
    setFile(f);
    setError(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    return send(new FormData(e.currentTarget));
  }

  // Skips the resume: only the background goes up, and the profile starts empty.
  function fillManually() {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    data.delete("resume");
    data.set("manual", "1");
    return send(data);
  }

  async function send(body: FormData) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-resume", { method: "POST", body });
      const result = await res.json();
      if (result.ok) return router.push("/onboarding/profile");
      setError(result.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  const manualButton = (
    <button type="button" className="rdb-btn rdb-btn--secondary" onClick={fillManually}>
      Fill it out manually
    </button>
  );

  const tooBig = file !== null && file.size > MAX_BYTES;

  // The form stays mounted (just hidden) while reading, so the chosen file survives a failed attempt.
  return (
    <>
      {busy && (
        <div
          className="rdb-section"
          style={{ marginTop: 32 }}
          role="status"
          aria-live="polite"
        >
          <p style={{ margin: "0 0 12px" }}>
            <b>Reading your resume…</b>{" "}
            <span className="rdb-muted">
              Finding your experience, projects, education and skills. This can
              take up to a minute.
            </span>
          </p>
          <div className="rdb-progress" />
        </div>
      )}
      <form
        ref={formRef}
        onSubmit={onSubmit}
        hidden={busy}
        className="rdb-section"
        style={{ marginTop: 32 }}
      >
        <span className="rdb-label" id="resume-label">
          Your resume
        </span>
        <label
          className="rdb-dropzone ob-drop"
          data-over={dragging || undefined}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const dropped = e.dataTransfer.files[0];
            if (dropped && fileRef.current) {
              const dt = new DataTransfer();
              dt.items.add(dropped);
              fileRef.current.files = dt.files;
              pick(dropped);
            }
          }}
        >
          <span className="ob-up">
            <Upload className="rdb-icon" width={22} height={22} aria-hidden />
          </span>
          <div>
            <b>Drop your resume here</b> or{" "}
            <span className="rdb-link">choose a file</span>
          </div>
          <div className="rdb-small rdb-muted">
            PDF or Word (.docx), up to 4 MB
          </div>
          <input
            ref={fileRef}
            type="file"
            name="resume"
            required
            className="sr-only"
            aria-labelledby="resume-label"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </label>
        {file && (
          <div className="rdb-file" style={{ marginTop: 12 }}>
            <FileText
              className="rdb-icon"
              width={20}
              height={20}
              aria-hidden
              style={{ color: "var(--ink-muted)" }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{file.name}</b>
              <div
                className={
                  tooBig ? "rdb-small rdb-help--error" : "rdb-small rdb-muted"
                }
              >
                {formatSize(file.size)}
                {tooBig && " — over the 4 MB limit"}
              </div>
            </div>
            <button
              type="button"
              className="rdb-iconbtn"
              aria-label="Remove file"
              onClick={() => {
                if (fileRef.current) fileRef.current.value = "";
                pick(null);
              }}
            >
              <X className="rdb-icon" width={16} height={16} aria-hidden />
            </button>
          </div>
        )}

        <hr className="rdb-divider" />

        <label className="rdb-label" htmlFor="background">
          A few lines about you
        </label>
        <span className="rdb-help">
          Who you are and what you&apos;re looking for next. We use it to write
          tailored summaries.
        </span>
        <textarea
          id="background"
          name="background"
          className="rdb-textarea"
          rows={5}
        />

        {error && (
          <div style={{ marginTop: 20 }}>
            <ErrorAlert message={error} />
          </div>
        )}

        <div className="rdb-actions" style={{ marginTop: 24 }}>
          <button
            className="rdb-btn rdb-btn--primary"
            disabled={!file || tooBig}
          >
            Read my resume
          </button>
          {manualButton}
          <span className="rdb-small rdb-muted">Takes up to a minute.</span>
        </div>
      </form>
    </>
  );
}
