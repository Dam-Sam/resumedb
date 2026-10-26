"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import type { TailorInput } from "@/lib/resume/types";

type Missing = Partial<Record<"company" | "jobTitle" | "jobDescription", string>>;

export default function TailorForm({
  value,
  onChange,
  onSubmit,
}: {
  value: TailorInput;
  onChange: (v: TailorInput) => void;
  onSubmit: () => void;
}) {
  const [missing, setMissing] = useState<Missing>({});
  const set = <K extends keyof TailorInput>(key: K, v: TailorInput[K]) => {
    onChange({ ...value, [key]: v });
    if (key in missing) setMissing({ ...missing, [key]: undefined });
  };

  function submit() {
    const next: Missing = {};
    if (!value.company.trim()) next.company = "Add the company so we can save it to your Tracker.";
    if (!value.jobTitle.trim()) next.jobTitle = "Add the job title.";
    if (!value.jobDescription.trim()) next.jobDescription = "Paste the job description so we know what to aim for.";
    setMissing(next);
    if (Object.keys(next).length === 0) onSubmit();
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rdb-section"
      style={{ marginTop: 28 }}
    >
      <div className="rdb-grid2">
        <label>
          <span className="rdb-label">Company</span>
          <input
            className="rdb-input"
            value={value.company}
            onChange={(e) => set("company", e.target.value)}
            aria-invalid={!!missing.company}
            aria-describedby={missing.company ? "err-company" : undefined}
          />
          {missing.company && (
            <span id="err-company" className="rdb-help rdb-help--error" style={{ margin: "6px 0 0" }}>
              {missing.company}
            </span>
          )}
        </label>
        <label>
          <span className="rdb-label">Job title</span>
          <input
            className="rdb-input"
            value={value.jobTitle}
            onChange={(e) => set("jobTitle", e.target.value)}
            aria-invalid={!!missing.jobTitle}
            aria-describedby={missing.jobTitle ? "err-title" : undefined}
          />
          {missing.jobTitle && (
            <span id="err-title" className="rdb-help rdb-help--error" style={{ margin: "6px 0 0" }}>
              {missing.jobTitle}
            </span>
          )}
        </label>
      </div>
      <label style={{ display: "block", marginTop: 20 }}>
        <span className="rdb-label">Job description</span>
        <span className="rdb-help">Paste the whole posting. Requirements, responsibilities and the &quot;about us&quot; all help.</span>
        <textarea
          className="rdb-textarea"
          rows={13}
          value={value.jobDescription}
          onChange={(e) => set("jobDescription", e.target.value)}
          aria-invalid={!!missing.jobDescription}
          aria-describedby={missing.jobDescription ? "err-jd" : undefined}
        />
        {missing.jobDescription && (
          <span id="err-jd" className="rdb-help rdb-help--error" style={{ margin: "6px 0 0" }}>
            {missing.jobDescription}
          </span>
        )}
      </label>
      <div className="rdb-small rdb-muted" style={{ textAlign: "right", marginTop: 4 }}>
        {value.jobDescription.length.toLocaleString("en-US")} characters
      </div>
      <hr className="rdb-divider" style={{ margin: "16px 0 20px" }} />
      <button
        type="button"
        role="switch"
        aria-checked={value.includeSummary}
        className="rdb-switch"
        onClick={() => set("includeSummary", !value.includeSummary)}
      >
        <span className="rdb-switch__track" />
        <span>
          <b>Write a tailored summary</b>
          <span className="rdb-small rdb-muted" style={{ display: "block" }}>
            A short paragraph at the top, written from your background and aimed at this posting. Choose now; it can&apos;t be added after.
          </span>
        </span>
      </button>
      <div className="rdb-actions" style={{ marginTop: 28 }}>
        <button type="submit" className="rdb-btn rdb-btn--primary">
          <Sparkles className="rdb-icon rdb-icon-on-primary" aria-hidden /> Tailor my resume
        </button>
        <span className="rdb-small rdb-muted">About a minute. You&apos;ll review every change before downloading.</span>
      </div>
    </form>
  );
}
