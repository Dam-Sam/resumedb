"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

// Lists bullets from your profile for one job or project: the other bullets
// to swap in (Replace), or the hidden ones to bring back (Add a bullet back).
export default function ReplaceDialog({
  title = "Replace with another bullet",
  empty = "Every bullet for this job is already in the resume. Add more on your Profile and they'll show up here next time.",
  subtitle,
  options,
  onPick,
  onClose,
}: {
  title?: string;
  empty?: string;
  subtitle?: React.ReactNode;
  options: { id: string; body: string }[];
  onPick: (bullet: { id: string; body: string }) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="ws-scrim" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="replace-title"
        onClick={(e) => e.stopPropagation()}
        className="rdb-dialog ws-dialog"
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2 id="replace-title" className="rdb-h2" style={{ flex: 1 }}>
            {title}
          </h2>
          <button ref={closeRef} onClick={onClose} aria-label="Close" className="rdb-iconbtn">
            <X className="rdb-icon" aria-hidden />
          </button>
        </div>
        {subtitle && (
          <p className="rdb-small rdb-muted" style={{ margin: "4px 0 8px" }}>
            {subtitle}
          </p>
        )}
        {options.length === 0 ? (
          <p className="rdb-muted" style={{ margin: "8px 0 0" }}>
            {empty}
          </p>
        ) : (
          options.map((b) => (
            <button key={b.id} onClick={() => onPick(b)} className="rdb-option">
              {b.body}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
