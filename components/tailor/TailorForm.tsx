"use client";

import type { TailorInput } from "@/lib/resume/types";

export default function TailorForm({
  value,
  onChange,
  onSubmit,
}: {
  value: TailorInput;
  onChange: (v: TailorInput) => void;
  onSubmit: () => void;
}) {
  const set = <K extends keyof TailorInput>(key: K, v: TailorInput[K]) => onChange({ ...value, [key]: v });
  const input = "mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm">
          Company
          <input required value={value.company} onChange={(e) => set("company", e.target.value)} className={input} />
        </label>
        <label className="block text-sm">
          Job title
          <input required value={value.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} className={input} />
        </label>
      </div>
      <label className="block text-sm">
        Job description
        <textarea
          required
          rows={14}
          value={value.jobDescription}
          onChange={(e) => set("jobDescription", e.target.value)}
          placeholder="Paste the full job posting here."
          className={input}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.includeSummary}
          onChange={(e) => set("includeSummary", e.target.checked)}
        />
        Include a tailored summary
      </label>
      <button className="rounded-md bg-gray-900 px-4 py-2 text-white">Tailor my resume</button>
    </form>
  );
}
