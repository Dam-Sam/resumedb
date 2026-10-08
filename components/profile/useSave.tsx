"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/profile/actions";

// Runs a server action and tracks "Saving…" / "Saved" / an error message.
export function useSave() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ error?: string; saved?: boolean }>({});

  function save(action: () => Promise<ActionResult>, onDone?: () => void) {
    startTransition(async () => {
      const result = await action();
      setStatus(result.error ? { error: result.error } : { saved: true });
      if (!result.error) onDone?.();
    });
  }

  const message = pending ? "Saving…" : status.error ?? (status.saved ? "Saved" : null);
  return { save, pending, message, isError: !pending && !!status.error };
}

export function SaveStatus({ message, isError }: { message: string | null; isError: boolean }) {
  if (!message) return null;
  return (
    <span role="status" className={`text-xs ${isError ? "text-red-700" : "text-gray-500"}`}>
      {message}
    </span>
  );
}

export const inputClass = "w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm";
export const smallButton = "rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50";
