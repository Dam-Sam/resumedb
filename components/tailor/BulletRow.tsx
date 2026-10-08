"use client";

import type { WorkspaceAction } from "@/lib/resume/workspace-reducer";
import { sideText, type Side, type TailoredBullet } from "@/lib/resume/types";

// One bullet: yours on the left, the AI's on the right. Only the selected side is editable.
export default function BulletRow({
  bullet,
  dispatch,
}: {
  bullet: TailoredBullet;
  dispatch: (a: WorkspaceAction) => void;
}) {
  const unchanged = bullet.ai === bullet.original;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <Column bullet={bullet} side="original" label="Yours" dispatch={dispatch} />
        <Column bullet={bullet} side="ai" label={unchanged ? "AI's (no change)" : "AI's"} dispatch={dispatch} />
      </div>
      <div className="flex gap-2 text-xs">
        <button
          onClick={() => dispatch({ type: "select", bulletId: bullet.id, side: "original" })}
          disabled={bullet.selected === "original"}
          className="rounded border border-gray-300 bg-white px-2 py-1 disabled:opacity-40"
        >
          Keep mine
        </button>
        <button
          onClick={() => dispatch({ type: "select", bulletId: bullet.id, side: "ai" })}
          disabled={bullet.selected === "ai"}
          className="rounded border border-gray-300 bg-white px-2 py-1 disabled:opacity-40"
        >
          Use AI&apos;s
        </button>
      </div>
    </div>
  );
}

function Column({
  bullet,
  side,
  label,
  dispatch,
}: {
  bullet: TailoredBullet;
  side: Side;
  label: string;
  dispatch: (a: WorkspaceAction) => void;
}) {
  const selected = bullet.selected === side;
  // Red/green like a Git diff, only as a hint; the border and "Selected" label carry the meaning.
  const tint = side === "original" ? "bg-rose-50" : "bg-emerald-50";

  return (
    <div
      className={`rounded-md p-3 text-sm ${tint} ${
        selected ? "border-2 border-gray-900" : "border border-gray-200 opacity-55"
      }`}
    >
      <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
        <span>{label}</span>
        {selected && <span className="rounded bg-gray-900 px-1.5 py-0.5 font-medium text-white">Selected</span>}
      </div>
      {selected ? (
        <textarea
          aria-label={`${label} bullet, selected`}
          value={sideText(bullet, side)}
          onChange={(e) => dispatch({ type: "edit", bulletId: bullet.id, text: e.target.value })}
          className="field-sizing-content w-full resize-none rounded border border-gray-300 bg-white p-2"
        />
      ) : (
        <p className="p-2">{sideText(bullet, side)}</p>
      )}
    </div>
  );
}
