"use client";

import { Check, Repeat2, X } from "lucide-react";
import { diffWords } from "@/lib/resume/diff";
import { sideText, type Side, type TailoredBullet } from "@/lib/resume/types";
import type { WorkspaceAction } from "@/lib/resume/workspace-reducer";

// One bullet: yours on the left, the rewrite on the right, the chosen side outlined and editable.
// With no rewrite worth comparing (unchanged, or swapped in with Replace) it's a single card.
export default function BulletRow({
  bullet,
  dispatch,
  onReplace,
}: {
  bullet: TailoredBullet;
  dispatch: (a: WorkspaceAction) => void;
  onReplace: () => void;
}) {
  const swapped = bullet.ai === null;
  const unchanged = bullet.ai === bullet.original;
  const single = swapped || unchanged;

  return (
    <div className={`ws-row ${single ? "one" : ""}`}>
      {single ? (
        <Card
          bullet={bullet}
          side={bullet.selected}
          label={swapped ? "Swapped in from your profile" : "Yours · no rewrite needed"}
          plain={unchanged}
          dispatch={dispatch}
        />
      ) : (
        <>
          <Card bullet={bullet} side="original" label="Yours" dispatch={dispatch} />
          <Card bullet={bullet} side="ai" label="Rewrite for this job" dispatch={dispatch} />
        </>
      )}
      <div className="ws-acts">
        <button className="rdb-iconbtn" aria-label="Replace with another bullet" title="Replace" onClick={onReplace}>
          <Repeat2 className="rdb-icon" aria-hidden />
        </button>
        <button
          className="rdb-iconbtn"
          aria-label="Remove bullet"
          title="Remove"
          onClick={() => dispatch({ type: "remove", bulletId: bullet.id })}
        >
          <X className="rdb-icon" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function Card({
  bullet,
  side,
  label,
  plain = false,
  dispatch,
}: {
  bullet: TailoredBullet;
  side: Side;
  label: string;
  plain?: boolean;
  dispatch: (a: WorkspaceAction) => void;
}) {
  const selected = bullet.selected === side;
  const text = sideText(bullet, side);
  // Changed words are marked on the rewrite only, against your own wording.
  const parts = side === "ai" && bullet.ai !== null && bullet.ai !== bullet.original ? diffWords(sideText(bullet, "original"), text) : [{ text, changed: false }];

  return (
    <div className={`ws-bc ${selected ? "on" : "off"} ${plain ? "nochange" : ""}`}>
      <div className="ws-bc__head">
        <span>{label}</span>
        {selected && (
          <span className="ws-inres">
            <Check className="rdb-icon" width={14} height={14} aria-hidden /> In resume
          </span>
        )}
      </div>
      {selected ? (
        <div className="ws-edit">
          <div className="ws-edit__mirror" aria-hidden>
            {parts.map((p, i) => (p.changed ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))}
            {"​"}
          </div>
          <textarea
            aria-label={`${label} bullet, in resume`}
            value={text}
            onChange={(e) => dispatch({ type: "edit", bulletId: bullet.id, text: e.target.value })}
          />
        </div>
      ) : (
        <>
          <div style={{ flex: 1, whiteSpace: "pre-wrap" }}>
            {parts.map((p, i) => (p.changed ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))}
          </div>
          <button
            className="rdb-btn rdb-btn--quiet rdb-btn--sm ws-use"
            onClick={() => dispatch({ type: "select", bulletId: bullet.id, side })}
          >
            {side === "original" ? "Use mine" : "Use rewrite"}
          </button>
        </>
      )}
    </div>
  );
}
