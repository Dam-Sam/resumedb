"use client";

import { X } from "lucide-react";
import { useState } from "react";
import * as actions from "@/app/profile/actions";
import type { Profile } from "@/lib/profile/repository";
import { SaveStatus, smallButton, useSave } from "./useSave";

// All your skills: name and category save when you leave the field.
export default function SkillsEditor({ skills }: { skills: Profile["skills"] }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const add = useSave();

  return (
    <>
      <table className="rdb-table pf-table">
        <thead>
          <tr>
            <th>Skill</th>
            <th>Category</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {skills.map((s) => (
            <SkillRow key={s.id} skill={s} />
          ))}
          <tr>
            <td>
              <input aria-label="New skill" className="rdb-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="New skill" />
            </td>
            <td>
              <input aria-label="New skill category" className="rdb-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Languages" />
            </td>
            <td>
              <button
                disabled={add.pending}
                onClick={() =>
                  add.save(() => actions.addSkill(name, category), () => {
                    setName("");
                    setCategory("");
                  })
                }
                className={smallButton}
              >
                Add
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <SaveStatus message={add.isError ? add.message : null} isError={add.isError} />
    </>
  );
}

function SkillRow({ skill }: { skill: Profile["skills"][number] }) {
  const [name, setName] = useState(skill.name);
  const [category, setCategory] = useState(skill.category ?? "");
  const { save, pending, message, isError } = useSave();
  const persist = () => {
    if (name !== skill.name || category !== (skill.category ?? "")) save(() => actions.saveSkill(skill.id, name, category));
  };
  return (
    <tr>
      <td>
        <input aria-label="Skill" className="rdb-input rdb-input--quiet" value={name} onChange={(e) => setName(e.target.value)} onBlur={persist} />
        {isError && <SaveStatus message={message} isError />}
      </td>
      <td>
        <input aria-label="Category" className="rdb-input rdb-input--quiet" value={category} onChange={(e) => setCategory(e.target.value)} onBlur={persist} />
      </td>
      <td style={{ width: 40 }}>
        <button disabled={pending} onClick={() => save(() => actions.removeSkill(skill.id))} className="rdb-iconbtn" aria-label={`Remove ${skill.name}`}>
          <X className="rdb-icon" aria-hidden />
        </button>
      </td>
    </tr>
  );
}
