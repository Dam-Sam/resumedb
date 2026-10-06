"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import LoadingBar from "@/components/LoadingBar";

export default function OnboardingForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-resume", { method: "POST", body: new FormData(e.currentTarget) });
      const body = await res.json();
      if (body.ok) return router.push("/profile");
      if (body.unreadable) return router.push("/profile?unreadable=1");
      setError(body.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
      <label className="block text-sm">
        <span className="font-medium">Your resume</span>
        <span className="block text-gray-600">PDF or Word (.docx), up to 4 MB.</span>
        <input
          type="file"
          name="resume"
          required
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">A short personal background</span>
        <span className="block text-gray-600">
          Who you are and what you&apos;re looking for. It&apos;s used to write tailored summaries.
        </span>
        <textarea
          name="background"
          rows={5}
          className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {busy ? (
        <LoadingBar label="Reading your resume… this can take up to a minute." />
      ) : (
        <button className="rounded-md bg-gray-900 px-4 py-2 text-white">Upload and continue</button>
      )}
    </form>
  );
}
