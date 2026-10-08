"use client";

import { useState } from "react";
import * as actions from "@/app/profile/actions";
import type { ProfileItem } from "@/lib/profile/repository";
import BulletListEditor from "./BulletListEditor";
import { inputClass, SaveStatus, smallButton, useSave } from "./useSave";

// One job, project, degree... Fields save with the Save button; bullets and skills save as you go.
export default function ItemEditor({ item }: { item: ProfileItem }) {
  const [f, setF] = useState({
    title: item.title,
    organization: item.organization ?? "",
    location: item.location ?? "",
    start: item.start_date?.slice(0, 7) ?? "",
    end: item.end_date?.slice(0, 7) ?? "",
    is_current: item.is_current,
    description: item.description ?? "",
    url: item.details.url ?? "",
    field: item.details.field ?? "",
    gpa: item.details.gpa ?? "",
  });
  const { save, pending, message, isError } = useSave();
  const set = (patch: Partial<typeof f>) => setF({ ...f, ...patch });
  const isEducation = item.type === "education";

  function onSave() {
    save(() =>
      actions.saveItem(item.id, {
        title: f.title,
        organization: f.organization,
        location: f.location,
        start_date: f.start ? `${f.start}-01` : null,
        end_date: f.end ? `${f.end}-01` : null,
        is_current: f.is_current,
        description: f.description,
        details: { ...item.details, url: f.url, ...(isEducation ? { field: f.field, gpa: f.gpa } : {}) },
      }),
    );
  }

  const text = (key: "title" | "organization" | "location" | "url" | "field" | "gpa", label: string) => (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      <input value={f[key]} onChange={(e) => set({ [key]: e.target.value })} className={`mt-1 ${inputClass}`} />
    </label>
  );

  return (
    <article className="space-y-4 rounded-md border border-gray-200 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {text("title", isEducation ? "Degree" : "Title")}
        {text("organization", isEducation ? "School" : "Organization")}
        {text("location", "Location")}
        {text("url", "Link")}
        {isEducation && text("field", "Field of study")}
        {isEducation && text("gpa", "GPA")}
        <label className="block text-sm">
          <span className="text-gray-600">Start</span>
          <input type="month" value={f.start} onChange={(e) => set({ start: e.target.value })} className={`mt-1 ${inputClass}`} />
        </label>
        <div className="text-sm">
          <label className="block">
            <span className="text-gray-600">End</span>
            <input
              type="month"
              value={f.is_current ? "" : f.end}
              disabled={f.is_current}
              onChange={(e) => set({ end: e.target.value })}
              className={`mt-1 ${inputClass} disabled:bg-gray-100`}
            />
          </label>
          <label className="mt-1 flex items-center gap-2">
            <input type="checkbox" checked={f.is_current} onChange={(e) => set({ is_current: e.target.checked })} />
            Current
          </label>
        </div>
      </div>
      <label className="block text-sm">
        <span className="text-gray-600">Description (optional)</span>
        <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} className={`mt-1 field-sizing-content resize-none ${inputClass}`} />
      </label>
      <div className="flex items-center gap-2">
        <button disabled={pending} onClick={onSave} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50">
          Save
        </button>
        <SaveStatus message={message} isError={isError} />
        <span className="flex-1" />
        <button disabled={pending} onClick={() => save(() => actions.removeItem(item.id))} className={smallButton}>
          Remove entry
        </button>
      </div>

      <BulletListEditor itemId={item.id} bullets={item.bullets} />
      <ItemSkills itemId={item.id} skills={item.skills} />
    </article>
  );
}

// Skills used on this entry, as removable tags.
function ItemSkills({ itemId, skills }: { itemId: string; skills: string[] }) {
  const [draft, setDraft] = useState("");
  const { save, pending, message, isError } = useSave();
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500">Skills used</h4>
      <div className="flex flex-wrap items-center gap-2">
        {skills.map((name) => (
          <span key={name} className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
            {name}
            <button
              aria-label={`Remove ${name}`}
              disabled={pending}
              onClick={() => save(() => actions.removeItemSkill(itemId, name))}
              className="text-gray-500 hover:text-gray-900"
            >
              ✕
            </button>
          </span>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(() => actions.addItemSkill(itemId, draft), () => setDraft(""));
          }}
          className="flex items-center gap-1"
        >
          <input
            aria-label="Add a skill to this entry"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add skill"
            className="w-28 rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs"
          />
        </form>
        <SaveStatus message={isError ? message : null} isError={isError} />
      </div>
    </div>
  );
}
