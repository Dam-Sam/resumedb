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

// The quiet save line: a dot and "Saving…" / "Saved", or the error in danger text.
export function SaveStatus({ message, isError }: { message: string | null; isError: boolean }) {
  if (!message) return null;
  return (
    <span role="status" className={isError ? "pf-error" : "rdb-save"}>
      {message}
    </span>
  );
}

export const inputClass = "rdb-input";
export const smallButton = "rdb-btn rdb-btn--secondary rdb-btn--sm";
