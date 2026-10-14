"use client";

import { useEffect } from "react";

// Lists bullets from your profile for one job or project: the other bullets
// to swap in (Replace), or the hidden ones to bring back (Add bullet).
export default function ReplaceDialog({
  title = "Replace with another bullet",
  empty = "No other bullets for this item.",
  options,
  onPick,
  onClose,
}: {
  title?: string;
  empty?: string;
  options: { id: string; body: string }[];
  onPick: (bullet: { id: string; body: string }) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="replace-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-lg"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="replace-title" className="font-semibold">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-900">
            ✕
          </button>
        </div>
        {options.length === 0 ? (
          <p className="text-sm text-gray-600">{empty}</p>
        ) : (
          <ul className="space-y-2">
            {options.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => onPick(b)}
                  className="w-full rounded-md border border-gray-200 p-3 text-left text-sm hover:border-gray-900 hover:bg-gray-50"
                >
                  {b.body}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
