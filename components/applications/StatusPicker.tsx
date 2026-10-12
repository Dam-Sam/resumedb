"use client";

import { useState, useTransition } from "react";
import { setStatus } from "@/app/applications/actions";
import { STATUS_LABELS, STATUSES, type Status } from "@/lib/applications/repository";

// Saves as soon as you pick; the page refreshes with the new timeline entry.
export default function StatusPicker({ id, status }: { id: string; status: Status }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(status);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="status" className="text-sm text-gray-600">
        Status
      </label>
      <select
        id="status"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Status;
          setValue(next);
          setError(null);
          startTransition(async () => {
            const result = await setStatus(id, next);
            if (result.error) {
              setError(result.error);
              setValue(status);
            }
          });
        }}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm disabled:opacity-50"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      {pending && <span className="text-sm text-gray-500">Saving…</span>}
      {error && <span className="text-sm text-red-700">{error}</span>}
    </div>
  );
}
