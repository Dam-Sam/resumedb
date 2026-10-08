"use client";

import { useState } from "react";
import * as actions from "@/app/profile/actions";
import type { ItemType } from "@/lib/ai/schemas";
import { inputClass, SaveStatus, useSave } from "./useSave";

const TYPE_LABELS: Record<ItemType, string> = {
  work: "Work",
  volunteer: "Volunteer",
  research: "Research",
  project: "Project",
  open_source: "Open source",
  education: "Education",
  certification: "Certification",
  license: "License",
  award: "Award",
  publication: "Publication",
  language: "Language",
  other: "Other",
};

// Adds an entry. With `types` it's "Add entry" within a section; without, it's "Add section" (any type).
export default function AddSection({ types, label }: { types?: ItemType[]; label: string }) {
  const options = types ?? (Object.keys(TYPE_LABELS) as ItemType[]);
  const [type, setType] = useState<ItemType>(options[0]);
  const [title, setTitle] = useState("");
  const { save, pending, message, isError } = useSave();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(() => actions.addItem(type, title), () => setTitle(""));
      }}
      className="flex flex-wrap items-center gap-2"
    >
      {options.length > 1 && (
        <select
          aria-label="Entry type"
          value={type}
          onChange={(e) => setType(e.target.value as ItemType)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
        >
          {options.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      )}
      <input
        aria-label="New entry title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title, e.g. Software Developer"
        className={`max-w-xs ${inputClass}`}
      />
      <button disabled={pending} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50">
        {label}
      </button>
      <SaveStatus message={isError ? message : null} isError={isError} />
    </form>
  );
}
