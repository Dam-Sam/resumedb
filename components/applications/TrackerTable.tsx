"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteApplications } from "@/app/applications/actions";
import type { ApplicationRow } from "@/lib/applications/repository";
import LocalDate from "./LocalDate";
import StatusBadge from "./StatusBadge";

// The Tracker list. Tick rows (shift-click ticks a range) to delete them together.
export default function TrackerTable({ applications }: { applications: ApplicationRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // The last row ticked or unticked, where a shift-click range starts.
  const anchor = useRef<number | null>(null);
  const headerBox = useRef<HTMLInputElement>(null);

  // Rows deleted elsewhere (or just now) drop out of the selection.
  const ids = applications.map((a) => a.id);
  const chosen = ids.filter((id) => selected.has(id));
  const all = chosen.length === ids.length;

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
    <div className="mt-8">
      {/* Always takes up its space, so ticking the first row doesn't push the table down. */}
      <div role="toolbar" className="mb-3 flex min-h-12 flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
        {chosen.length === 0 ? (
          <span className="text-gray-500">Tick rows to delete them. Shift-click to select a range.</span>
        ) : confirming ? (
          <>
            <span>Delete {count}? Their timelines and saved resumes are deleted too. This can&apos;t be undone.</span>
            <button
              onClick={remove}
              disabled={pending}
              className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Delete"}
            </button>
            <button onClick={() => setConfirming(false)} disabled={pending} className="rounded-md border border-gray-300 px-3 py-1.5">
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="font-medium">{chosen.length} selected</span>
            <button onClick={() => setConfirming(true)} className="rounded-md border border-red-300 px-3 py-1.5 text-red-700 hover:bg-red-50">
              Delete
            </button>
            <button onClick={() => setSelected(new Set())} className="text-gray-600 hover:text-gray-900">
              Clear selection
            </button>
          </>
        )}
      </div>
      {error && <p className="mb-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  ref={headerBox}
                  type="checkbox"
                  aria-label="Select all applications"
                  checked={all}
                  onChange={() => {
                    setSelected(all ? new Set() : new Set(ids));
                    setConfirming(false);
                  }}
                  className="size-4 align-middle"
                />
              </th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Date applied</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {applications.map((a, i) => (
              <tr key={a.id} className={`relative ${selected.has(a.id) ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                {/* Above the row-wide link, so ticking doesn't open the application. */}
                <td className="relative z-10 w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${a.company}, ${a.job_title}`}
                    checked={selected.has(a.id)}
                    onChange={() => {}}
                    onClick={(e) => toggle(i, e.shiftKey)}
                    className="size-4 align-middle"
                  />
                </td>
                <td className="px-4 py-3 font-medium">
                  {/* The link stretches over the whole row. */}
                  <Link href={`/applications/${a.id}`} className="after:absolute after:inset-0">
                    {a.company}
                  </Link>
                </td>
                <td className="px-4 py-3">{a.job_title}</td>
                <td className="px-4 py-3 text-gray-600">
                  <LocalDate iso={a.applied_at} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
