"use client";

import { useState } from "react";
import * as actions from "@/app/profile/actions";
import type { Profile } from "@/lib/profile/repository";
import { inputClass, SaveStatus, smallButton, useSave } from "./useSave";

// All your skills: name and category save when you leave the field.
export default function SkillsEditor({ skills }: { skills: Profile["skills"] }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const add = useSave();

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-gray-500">
        <span>Skill</span>
        <span>Category</span>
        <span />
      </div>
      {skills.map((s) => (
        <SkillRow key={s.id} skill={s} />
      ))}
      <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
        <input aria-label="New skill" value={name} onChange={(e) => setName(e.target.value)} placeholder="New skill" className={inputClass} />
        <input aria-label="New skill category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Languages" className={inputClass} />
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
      </div>
      <SaveStatus message={add.isError ? add.message : null} isError={add.isError} />
    </div>
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
    <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
      <input aria-label="Skill" value={name} onChange={(e) => setName(e.target.value)} onBlur={persist} className={inputClass} />
      <input aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} onBlur={persist} className={inputClass} />
      <button disabled={pending} onClick={() => save(() => actions.removeSkill(skill.id))} className={smallButton}>
        Remove
      </button>
      {isError && (
        <div className="col-span-3">
          <SaveStatus message={message} isError />
        </div>
      )}
    </div>
  );
}
