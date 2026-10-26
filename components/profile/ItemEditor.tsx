"use client";

import { ChevronDown, Trash2, X } from "lucide-react";
import { useState } from "react";
import * as actions from "@/app/profile/actions";
import type { ProfileItem } from "@/lib/profile/repository";
import { formatRange } from "@/lib/profile/sections";
import BulletListEditor from "./BulletListEditor";
import { useOpenEntry } from "./OpenEntry";
import { inputClass, SaveStatus, useSave } from "./useSave";

// One job, project, degree... A collapsed row; the open one saves fields with "Save entry", bullets and skills as you go.
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
  const { openId, setOpenId } = useOpenEntry();
  const open = openId === item.id;
  const dates = formatRange(item.start_date, item.end_date, item.is_current);

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
    <label>
      <span className="rdb-label">{label}</span>
      <input value={f[key]} onChange={(e) => set({ [key]: e.target.value })} className={inputClass} />
    </label>
  );

  return (
    <article className={`pf-entry ${open ? "open" : ""}`}>
      <button className="pf-entry__head" aria-expanded={open} onClick={() => setOpenId(open ? null : item.id)}>
        <div>
          <b>{item.title || "Untitled"}</b>
          {item.organization && <span className="rdb-muted"> · {item.organization}</span>}
          {(dates || item.location) && (
            <div className="rdb-small rdb-muted">{[dates, item.location].filter(Boolean).join(" · ")}</div>
          )}
        </div>
        <span className="rdb-small rdb-muted">
          {item.bullets.length} {item.bullets.length === 1 ? "bullet" : "bullets"} · {item.skills.length}{" "}
          {item.skills.length === 1 ? "skill" : "skills"}
        </span>
        <ChevronDown className="rdb-icon" aria-hidden />
      </button>
      {open && (
        <div className="pf-entry__body">
          <div className="pf-g3">
            {text("title", isEducation ? "Degree" : "Title")}
            {text("organization", isEducation ? "School" : "Organization")}
            {text("location", "Location")}
            <label>
              <span className="rdb-label">Start</span>
              <input type="month" value={f.start} onChange={(e) => set({ start: e.target.value })} className={inputClass} />
            </label>
            <div>
              <label>
                <span className="rdb-label">End</span>
                <input
                  type="month"
                  value={f.is_current ? "" : f.end}
                  disabled={f.is_current}
                  onChange={(e) => set({ end: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="rdb-check" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={f.is_current} onChange={(e) => set({ is_current: e.target.checked })} />I work here now
              </label>
            </div>
            {text("url", "Link")}
            {isEducation && text("field", "Field of study")}
            {isEducation && text("gpa", "GPA")}
          </div>
          <label style={{ display: "block", marginTop: 16 }}>
            <span className="rdb-label">
              Description <span className="rdb-muted" style={{ fontWeight: 400 }}>(optional)</span>
            </span>
            <textarea
              rows={2}
              value={f.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="One line on what the team or project did."
              className="rdb-textarea"
            />
          </label>

          <BulletListEditor itemId={item.id} bullets={item.bullets} />
          <ItemSkills itemId={item.id} skills={item.skills} />

          <div className="pf-entry__foot">
            <button disabled={pending} onClick={onSave} className="rdb-btn rdb-btn--primary rdb-btn--sm">
              Save entry
            </button>
            <SaveStatus message={message} isError={isError} />
            <span style={{ flex: 1 }} />
            <button
              disabled={pending}
              onClick={() => save(() => actions.removeItem(item.id))}
              className="rdb-btn rdb-btn--quiet rdb-btn--sm"
              style={{ color: "var(--danger)" }}
            >
              <Trash2 className="rdb-icon" aria-hidden /> Remove entry
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

// Skills used on this entry, as removable chips.
function ItemSkills({ itemId, skills }: { itemId: string; skills: string[] }) {
  const [draft, setDraft] = useState("");
  const { save, pending, message, isError } = useSave();
  return (
    <div className="pf-sub">
      <h4>Skills used here</h4>
      <div className="pf-chips" style={{ marginTop: 10 }}>
        {skills.map((name) => (
          <span key={name} className="rdb-chip">
            {name}
            <button aria-label={`Remove ${name}`} disabled={pending} onClick={() => save(() => actions.removeItemSkill(itemId, name))}>
              <X className="rdb-icon" width={14} height={14} aria-hidden />
            </button>
          </span>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(() => actions.addItemSkill(itemId, draft), () => setDraft(""));
          }}
        >
          <input
            aria-label="Add a skill to this entry"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a skill"
            className="rdb-input pf-chipin"
          />
        </form>
        <SaveStatus message={isError ? message : null} isError={isError} />
      </div>
    </div>
  );
}
