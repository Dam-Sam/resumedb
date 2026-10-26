"use client";

import { useState, useTransition } from "react";
import { setStatus } from "@/app/applications/actions";
import { STATUS_LABELS, STATUSES, type Status } from "@/lib/applications/repository";

// The pipeline, closed aside: closing is its own button, not a stage.
const STAGES = STATUSES.filter((s) => s !== "rejected");

// Saves as soon as you pick; the page refreshes with the new timeline entry.
// On failure it steps back to where it was and says so.
export default function StatusPicker({ id, status }: { id: string; status: Status }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(status);
  const current = (STAGES as readonly Status[]).indexOf(value);

  function move(next: Status) {
    if (next === value) return;
    setValue(next);
    setError(null);
    startTransition(async () => {
      const result = await setStatus(id, next);
      if (result.error) {
        setValue(status);
        setError(`We couldn't move it to ${STATUS_LABELS[next]}. It's still at ${STATUS_LABELS[status]}; try again.`);
      }
    });
  }

  return (
    <section className="rdb-section" style={{ padding: "20px 24px" }}>
      <div className="flex items-center gap-4">
        <ol className="rdb-stages" aria-label="Status">
          {STAGES.map((s, i) => (
            <li key={s} className={i < current ? "done" : i === current ? "cur" : ""}>
              <button type="button" disabled={pending} aria-current={i === current ? "step" : undefined} onClick={() => move(s)}>
                {STATUS_LABELS[s]}
              </button>
            </li>
          ))}
        </ol>
        <span style={{ color: "var(--ink-subtle)", fontSize: 13 }}>or</span>
        <button
          type="button"
          className="rdb-btn rdb-btn--secondary rdb-btn--sm"
          disabled={pending || value === "rejected"}
          onClick={() => move("rejected")}
        >
          {value === "rejected" ? "Closed" : "Mark closed"}
        </button>
      </div>
      <p className="rdb-small rdb-muted" style={{ margin: "12px 0 0" }} aria-live="polite">
        {pending ? "Saving…" : "Click a stage to move this application. Each move is added to the timeline below."}
      </p>
      {error && (
        <div className="rdb-notice rdb-notice--error" role="alert" style={{ marginTop: "var(--space-3)" }}>
          <div>{error}</div>
        </div>
      )}
    </section>
  );
}
