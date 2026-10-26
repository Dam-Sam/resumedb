"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import * as actions from "@/app/profile/actions";
import { SaveStatus, smallButton, useSave } from "./useSave";

// Each bullet saves when you leave it; add and remove save straight away.
export default function BulletListEditor({ itemId, bullets }: { itemId: string; bullets: { id: string; body: string }[] }) {
  const [draft, setDraft] = useState("");
  const add = useSave();

  return (
    <div className="pf-sub">
      <h4>Bullets</h4>
      <p className="rdb-small rdb-muted">Write everything; tailoring picks the best few for each job.</p>
      <ul className="pf-bullets">
        {bullets.map((b) => (
          <BulletField key={b.id} bullet={b} />
        ))}
        <li>
          <textarea
            aria-label="New bullet"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a bullet…"
            className="rdb-textarea pf-bullet"
          />
          <button disabled={add.pending} onClick={() => add.save(() => actions.addBullet(itemId, draft), () => setDraft(""))} className={smallButton}>
            Add
          </button>
        </li>
      </ul>
      <SaveStatus message={add.isError ? add.message : null} isError={add.isError} />
    </div>
  );
}

function BulletField({ bullet }: { bullet: { id: string; body: string } }) {
  const [body, setBody] = useState(bullet.body);
  const { save, pending, message, isError } = useSave();
  return (
    <li>
      <div>
        <textarea
          aria-label="Bullet"
          rows={1}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={() => body !== bullet.body && save(() => actions.saveBullet(bullet.id, body))}
          className="rdb-textarea pf-bullet"
        />
        {isError && <SaveStatus message={message} isError />}
      </div>
      <button disabled={pending} onClick={() => save(() => actions.removeBullet(bullet.id))} className="rdb-iconbtn" aria-label="Remove bullet">
        <Trash2 className="rdb-icon" aria-hidden />
      </button>
    </li>
  );
}
