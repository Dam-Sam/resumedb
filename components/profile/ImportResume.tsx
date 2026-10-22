"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import LoadingBar from "@/components/LoadingBar";

type Mode = "add" | "replace";

// Re-import a resume onto an existing profile, either appending to it or replacing it.
export default function ImportResume() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("add");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mode === "replace" && !confirm("Replace your profile? Your current entries and skills will be deleted.")) return;
    const form = e.currentTarget;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-resume", { method: "POST", body: new FormData(form) });
      const body = await res.json();
      if (body.ok) {
        form.reset();
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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">PDF or Word (.docx), up to 4 MB.</p>
      <input
        type="file"
        name="resume"
        required
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5"
      />
      <fieldset className="space-y-2 text-sm">
        <legend className="sr-only">What to do with your current profile</legend>
        <label className="flex items-start gap-2">
          <input type="radio" name="mode" value="add" checked={mode === "add"} onChange={() => setMode("add")} className="mt-1" />
          <span>
            <span className="font-medium">Add to my profile</span>
            <span className="block text-gray-600">Keeps what you have and adds the resume&apos;s entries and skills.</span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="radio" name="mode" value="replace" checked={mode === "replace"} onChange={() => setMode("replace")} className="mt-1" />
          <span>
            <span className="font-medium">Replace my profile</span>
            <span className="block text-gray-600">Deletes your current entries, skills and contact info first.</span>
          </span>
        </label>
      </fieldset>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {busy ? (
        <LoadingBar label="Reading your resume… this can take up to a minute." />
      ) : (
        <button className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white">Import resume</button>
      )}
    </form>
  );
}
