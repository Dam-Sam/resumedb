"use client";

import { useState } from "react";
import * as actions from "@/app/profile/actions";
import { inputClass, SaveStatus, smallButton, useSave } from "./useSave";

// Each bullet saves when you leave it; add and remove save straight away.
export default function BulletListEditor({ itemId, bullets }: { itemId: string; bullets: { id: string; body: string }[] }) {
  const [draft, setDraft] = useState("");
  const add = useSave();

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500">Bullets</h4>
      <ul className="space-y-2">
        {bullets.map((b) => (
          <BulletField key={b.id} bullet={b} />
        ))}
      </ul>
      <div className="flex items-start gap-2">
        <textarea
          aria-label="New bullet"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a bullet…"
          className={`field-sizing-content resize-none ${inputClass}`}
        />
        <button
          disabled={add.pending}
          onClick={() => add.save(() => actions.addBullet(itemId, draft), () => setDraft(""))}
          className={smallButton}
        >
          Add
        </button>
      </div>
      <SaveStatus message={add.isError ? add.message : null} isError={add.isError} />
    </div>
  );
}

function BulletField({ bullet }: { bullet: { id: string; body: string } }) {
  const [body, setBody] = useState(bullet.body);
  const { save, pending, message, isError } = useSave();
  return (
    <li className="flex items-start gap-2">
      <span className="pt-1.5 text-gray-400">•</span>
      <div className="flex-1">
        <textarea
          aria-label="Bullet"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={() => body !== bullet.body && save(() => actions.saveBullet(bullet.id, body))}
          className={`field-sizing-content resize-none ${inputClass}`}
        />
        <SaveStatus message={message} isError={isError} />
      </div>
      <button disabled={pending} onClick={() => save(() => actions.removeBullet(bullet.id))} className={smallButton}>
        Remove
      </button>
    </li>
  );
}
