"use client";

import { Mail, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteApplications } from "@/app/applications/actions";
import type { DashboardApplication, Status } from "@/lib/applications/repository";
import DaysSince from "./DaysSince";
import LocalDate from "./LocalDate";
import StatusBadge from "./StatusBadge";

type Filter = "all" | "progress" | "offers" | "closed";

const FILTERS: { id: Filter; label: string; test: (s: Status) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "progress", label: "In progress", test: (s) => s !== "offer" && s !== "rejected" },
  { id: "offers", label: "Offers", test: (s) => s === "offer" },
  { id: "closed", label: "Closed", test: (s) => s === "rejected" },
];

// The Tracker list. Filter and search work on the loaded list. Tick rows
// (shift-click ticks a range) to delete them together.
export default function TrackerTable({ applications }: { applications: DashboardApplication[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  // The last row ticked or unticked, where a shift-click range starts.
  const anchor = useRef<number | null>(null);
  const headerBox = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => {
    const test = FILTERS.find((f) => f.id === filter)!.test;
    return applications.filter(
      (a) => test(a.status) && (!q || a.company.toLowerCase().includes(q) || a.job_title.toLowerCase().includes(q)),
    );
  }, [applications, filter, q]);

  // Rows deleted elsewhere (or just now), or filtered out, drop out of the selection.
  const ids = shown.map((a) => a.id);
  const chosen = ids.filter((id) => selected.has(id));
  const all = ids.length > 0 && chosen.length === ids.length;

  useEffect(() => {
    if (headerBox.current) headerBox.current.indeterminate = chosen.length > 0 && !all;
  }, [chosen.length, all]);

  function toggle(index: number, shift: boolean) {
    const id = ids[index];
    const on = !selected.has(id);
    const next = new Set(selected);
    const [from, to] = shift && anchor.current !== null ? [Math.min(anchor.current, index), Math.max(anchor.current, index)] : [index, index];
    for (let i = from; i <= to; i++) {
      if (on) next.add(ids[i]);
      else next.delete(ids[i]);
    }
    anchor.current = index;
    setSelected(next);
    setConfirming(false);
  }

  function remove() {
    startTransition(async () => {
      setError(null);
      const r = await deleteApplications(chosen);
      if (r.error) setError(r.error);
      else setSelected(new Set());
      setConfirming(false);
    });
  }

  const count = `${chosen.length} application${chosen.length === 1 ? "" : "s"}`;

  return (
    <div>
      <div className="flex items-center gap-3" style={{ marginBottom: "var(--space-3)" }}>
        <div className="rdb-seg" role="group" aria-label="Filter">
          {FILTERS.map((f) => (
            <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label} {applications.filter((a) => f.test(a.status)).length}
            </button>
          ))}
        </div>
        <input
          className="rdb-input"
          style={{ maxWidth: 280, marginLeft: "auto" }}
          type="search"
          placeholder="Search company or role"
          aria-label="Search company or role"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Always takes up its space, so ticking the first row doesn't push the table down. */}
      <div
        role="toolbar"
        className="rdb-toolbar"
        style={confirming ? { background: "var(--danger-soft)", color: "var(--danger-ink)" } : undefined}
      >
        {chosen.length === 0 ? (
          <span style={{ color: "var(--ink-muted)" }}>Tick rows to delete them. Shift-click to select a range.</span>
        ) : confirming ? (
          <>
            <span style={{ flex: 1 }}>
              <b>Delete {count}?</b> Their timelines and saved resumes go too. This can&apos;t be undone.
            </span>
            <button
              onClick={remove}
              disabled={pending}
              className="rdb-btn rdb-btn--sm"
              style={{ background: "var(--danger)", color: "var(--surface-raised)" }}
            >
              {pending ? "Deleting…" : `Delete ${chosen.length}`}
            </button>
            <button onClick={() => setConfirming(false)} disabled={pending} className="rdb-btn rdb-btn--secondary rdb-btn--sm">
              Cancel
            </button>
          </>
        ) : (
          <>
            <b>{chosen.length} selected</b>
            <button onClick={() => setConfirming(true)} className="rdb-btn rdb-btn--danger rdb-btn--sm">
              <Trash2 className="rdb-icon" aria-hidden /> Delete
            </button>
            <button onClick={() => setSelected(new Set())} className="rdb-btn rdb-btn--quiet rdb-btn--sm">
              Clear selection
            </button>
            <span className="rdb-small rdb-muted" style={{ marginLeft: "auto" }}>
              Shift-click to select a range.
            </span>
          </>
        )}
      </div>
      {error && (
        <div className="rdb-notice rdb-notice--error" role="alert" style={{ marginBottom: "var(--space-3)" }}>
          <div>{error}</div>
        </div>
      )}

      <div style={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <table className="rdb-table">
          <thead>
            <tr>
              <th style={{ width: 40, borderRadius: 0 }}>
                <input
                  ref={headerBox}
                  type="checkbox"
                  aria-label="Select all applications"
                  checked={all}
                  onChange={() => {
                    setSelected(all ? new Set() : new Set(ids));
                    setConfirming(false);
                  }}
                  style={{ width: 18, height: 18, accentColor: "var(--pine)" }}
                />
              </th>
              <th style={{ borderRadius: 0 }}>Company and role</th>
              <th>Applied</th>
              <th>Status</th>
              <th style={{ borderRadius: 0 }}>Last update</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((a, i) => (
              <tr key={a.id} aria-selected={selected.has(a.id)} style={{ position: "relative" }}>
                {/* Above the row-wide link, so ticking doesn't open the application. */}
                <td style={{ width: 40, position: "relative", zIndex: 1 }}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${a.company}, ${a.job_title}`}
                    checked={selected.has(a.id)}
                    onChange={() => {}}
                    onClick={(e) => toggle(i, e.shiftKey)}
                    style={{ width: 18, height: 18, accentColor: "var(--pine)" }}
                  />
                </td>
                <td>
                  {/* The link stretches over the whole row. */}
                  <Link href={`/applications/${a.id}`} className="co after:absolute after:inset-0" style={{ textDecoration: "none" }}>
                    {a.company}
                  </Link>
                  <div className="rdb-small rdb-muted">{a.job_title}</div>
                </td>
                <td className="rdb-muted">
                  <LocalDate iso={a.applied_at} />
                </td>
                <td>
                  <StatusBadge status={a.status} />
                </td>
                <td className="rdb-small rdb-muted">
                  {a.last_event && <DaysSince iso={a.last_event.created_at} />}
                  {a.last_event?.source === "email" && (
                    <span className="inline-flex items-center gap-1" style={{ marginLeft: 6, padding: "0 8px", height: 22, borderRadius: 999, border: "1px solid var(--line)", fontSize: 12 }}>
                      <Mail className="rdb-icon" width={13} height={13} aria-hidden /> From email
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr style={{ cursor: "default" }}>
                <td colSpan={5} className="rdb-muted" style={{ textAlign: "center", padding: "var(--space-8)" }}>
                  Nothing matches. Try another filter or search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="rdb-small rdb-muted" style={{ marginTop: 12 }}>
        Showing {shown.length} of {applications.length} · newest first
      </p>
    </div>
  );
}
