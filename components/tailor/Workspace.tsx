"use client";

import { ArrowLeft, Check, EyeOff, FileText, Plus, X } from "lucide-react";
import { useEffect, useReducer, useState } from "react";
import { formatRange } from "@/lib/profile/sections";
import { buildFinalResume } from "@/lib/resume/final";
import { countPdfPages } from "@/lib/resume/files";
import { fitToOnePage } from "@/lib/resume/fit";
import {
  itemTitle,
  PROJECT_TYPES,
  type Side,
  type TailoredItem,
  type TailoredSkill,
  type TailorResponse,
} from "@/lib/resume/types";
import { workspaceReducer, type WorkspaceAction } from "@/lib/resume/workspace-reducer";
import BulletRow from "./BulletRow";
import DownloadButtons, { type DownloadNotice } from "./DownloadButtons";
import KeySummaryPanel from "./KeySummaryPanel";
import ReplaceDialog from "./ReplaceDialog";
import SummaryEditor from "./SummaryEditor";
import TableOfContents from "./TableOfContents";

// Contents on the left, the resume with side-by-side bullets in the middle,
// what the posting wants on the right.
export default function Workspace({
  data,
  jobDescription,
  onStartOver,
}: {
  data: TailorResponse;
  jobDescription: string;
  onStartOver: () => void;
}) {
  const [resume, dispatch] = useReducer(workspaceReducer, data.resume);
  const [replacing, setReplacing] = useState<{ item: TailoredItem; bulletId: string } | null>(null);
  const [adding, setAdding] = useState<TailoredItem | null>(null);
  const [fitting, setFitting] = useState(true);
  const [pages, setPages] = useState<number | null>(null);
  const [notice, setNotice] = useState<DownloadNotice>(null);
  const { contact } = resume;

  // Starts at one page: cut lowest-relevance content until the real PDF fits.
  // Only once; after that, what you add back is up to you.
  useEffect(() => {
    let cancelled = false;
    fitToOnePage(data.resume)
      .then((fitted) => !cancelled && dispatch({ type: "load", state: fitted }))
      .catch((err) => console.error(err))
      .finally(() => !cancelled && setFitting(false));
    return () => {
      cancelled = true;
    };
  }, [data.resume]);

  // The live page count, re-measured shortly after each change.
  useEffect(() => {
    if (fitting) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      countPdfPages(buildFinalResume(resume))
        .then((n) => !cancelled && setPages(n))
        .catch((err) => console.error(err));
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [resume, fitting]);

  // Replace offers this item's profile bullets that aren't already showing.
  const replaceOptions = replacing
    ? (data.profileBulletsByItem[replacing.item.id] ?? []).filter(
        (b) => !replacing.item.bullets.some((shown) => shown.id === b.id && !shown.removed),
      )
    : [];

  // How many of the bullets showing use the rewrite (not yours, and not swapped in).
  const shown = resume.sections.flatMap((sec) => (sec.kind === "items" ? sec.items.filter((i) => !i.removed).flatMap((i) => i.bullets.filter((b) => !b.removed)) : []));
  const rewrites = shown.filter((b) => b.ai !== null && b.selected === "ai").length;
  const skillsShowing = resume.sections.flatMap((sec) => (sec.kind === "skills" ? sec.skills.filter((k) => !k.removed).map((k) => k.name) : []));
  const overOnePage = !fitting && pages !== null && pages > 1;

  return (
    <>
      <div className="ws-bar">
        <div className="ws-bar__title">
          <button
            onClick={onStartOver}
            className="rdb-crumb"
            style={{ margin: 0, border: 0, background: "none", cursor: "pointer", font: "inherit" }}
          >
            <ArrowLeft className="rdb-icon" aria-hidden /> New tailoring
          </button>
          <span className="sep" />
          <h1>
            {resume.jobTitle} <span>at {resume.company}</span>
          </h1>
        </div>
        <div className="ws-bar__meta">
          <span className={`ws-fit ${fitting ? "" : overOnePage ? "warn" : pages === 1 ? "ok" : ""}`} aria-live="polite">
            <FileText className="rdb-icon" width={14} height={14} aria-hidden />
            {fitting
              ? "Fitting to one page…"
              : pages === null
                ? "Checking page count…"
                : pages === 1
                  ? "Fits on 1 page"
                  : `${pages} pages: hide a bullet or skill to fit one`}
          </span>
          <span className="rdb-small rdb-muted">
            {rewrites} of {shown.length} bullets use the rewrite
          </span>
        </div>
        <DownloadButtons resume={resume} jobDescription={jobDescription} onNotice={setNotice} />
      </div>
      {notice && (
        <div style={{ padding: "16px 32px 0", maxWidth: 1440, margin: "0 auto" }}>
          <div role="alert" className={`rdb-notice rdb-notice--${notice.kind}`}>
            <div>{notice.text}</div>
          </div>
        </div>
      )}

      <div className="ws-grid">
        <TableOfContents sections={resume.sections} onMove={(from, to) => dispatch({ type: "moveSection", from, to })} />

        <article className="ws-paper">
          <header className="ws-ph">
            <h2>{contact?.full_name || "Your name"}</h2>
            <p>
              {[contact?.email, contact?.phone, contact?.location, ...resume.links.map((l) => l.url)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </header>

          {resume.sections.map((section) => (
            <section key={section.key} id={`section-${section.key}`}>
              <h3 className="ws-sh">
                {section.title}
                {section.kind === "summary" && <span className="tag">Written for this job</span>}
                {section.kind === "skills" && <span className="tag">Most relevant first</span>}
              </h3>
              {section.kind === "summary" && (
                <SummaryEditor value={resume.summary ?? ""} onChange={(text) => dispatch({ type: "editSummary", text })} />
              )}
              {section.kind === "skills" && <Skills skills={section.skills} dispatch={dispatch} />}
              {section.kind === "items" && (
                <div>
                  {section.items
                    .filter((item) => !item.removed)
                    .map((item) => (
                      <Item
                        key={item.id}
                        item={item}
                        dispatch={dispatch}
                        onReplace={(bulletId) => setReplacing({ item, bulletId })}
                        onAdd={() => setAdding(item)}
                      />
                    ))}
                  <AddBack
                    label="Add a project back"
                    options={section.items.filter((i) => i.removed).map((i) => ({ id: i.id, name: itemTitle(i) }))}
                    onAdd={(itemId) => dispatch({ type: "setItemRemoved", itemId, removed: false })}
                  />
                </div>
              )}
            </section>
          ))}
        </article>

        <KeySummaryPanel keySummary={resume.keySummary} resumeSkills={skillsShowing} jobDescription={jobDescription} />
      </div>

      {adding && (
        <ReplaceDialog
          title="Add a bullet back"
          empty="Every bullet for this item is already showing."
          subtitle={<>Hidden bullets from <b>{itemTitle(adding)}</b>.</>}
          options={(findItem(resume, adding.id)?.bullets ?? [])
            .filter((b) => b.removed)
            .map((b) => ({ id: b.id, body: b.ai ?? b.original }))}
          onClose={() => setAdding(null)}
          onPick={(bullet) => {
            dispatch({ type: "restore", bulletId: bullet.id });
            setAdding(null);
          }}
        />
      )}

      {replacing && (
        <ReplaceDialog
          subtitle={<>Other bullets from <b>{itemTitle(replacing.item)}{replacing.item.organization ? ` · ${replacing.item.organization}` : ""}</b> in your profile.</>}
          options={replaceOptions}
          onClose={() => setReplacing(null)}
          onPick={(bullet) => {
            dispatch({ type: "replace", bulletId: replacing.bulletId, with: bullet });
            setReplacing(null);
          }}
        />
      )}
    </>
  );
}

function findItem(resume: { sections: TailorResponse["resume"]["sections"] }, id: string) {
  for (const s of resume.sections) if (s.kind === "items") for (const i of s.items) if (i.id === id) return i;
}

function Item({
  item,
  dispatch,
  onReplace,
  onAdd,
}: {
  item: TailoredItem;
  dispatch: (a: WorkspaceAction) => void;
  onReplace: (bulletId: string) => void;
  onAdd: () => void;
}) {
  const dates = formatRange(item.start_date, item.end_date, item.is_current);
  const hidden = item.bullets.filter((b) => b.removed).length;
  return (
    <div className="ws-item">
      <div className="ws-ih">
        <div>
          <b>{itemTitle(item)}</b>
          {item.organization && <span className="rdb-muted"> · {item.organization}</span>}
        </div>
        {dates && <span className="rdb-small rdb-muted">{dates}</span>}
      </div>
      {item.aiTitle && <TitleChoice item={item} onSelect={(side) => dispatch({ type: "selectTitle", itemId: item.id, side })} />}
      {item.description && (
        <p className="rdb-small rdb-muted" style={{ margin: "0 0 10px" }}>
          {item.description}
        </p>
      )}
      {item.bullets
        .filter((b) => !b.removed)
        .map((b) => (
          <BulletRow key={b.id} bullet={b} dispatch={dispatch} onReplace={() => onReplace(b.id)} />
        ))}
      <div className="ws-itemfoot">
        {hidden > 0 && (
          <button onClick={onAdd} className="rdb-btn rdb-btn--quiet rdb-btn--sm">
            <Plus className="rdb-icon" aria-hidden /> Add a bullet back · {hidden} hidden
          </button>
        )}
        {PROJECT_TYPES.includes(item.type) && (
          <button
            onClick={() => dispatch({ type: "setItemRemoved", itemId: item.id, removed: true })}
            className="rdb-btn rdb-btn--quiet rdb-btn--sm"
          >
            <EyeOff className="rdb-icon" aria-hidden /> Hide project
          </button>
        )}
      </div>
    </div>
  );
}

// Skills in relevance order. Irrelevant ones start hidden; × hides, the dashed chip adds back.
function Skills({ skills, dispatch }: { skills: TailoredSkill[]; dispatch: (a: WorkspaceAction) => void }) {
  return (
    <div className="ws-chips">
      {skills
        .filter((k) => !k.removed)
        .map((k) => (
          <span key={k.id} className="rdb-chip">
            {k.name}
            <button onClick={() => dispatch({ type: "setSkillRemoved", skillId: k.id, removed: true })} aria-label={`Hide ${k.name}`}>
              <X className="rdb-icon" width={14} height={14} aria-hidden />
            </button>
          </span>
        ))}
      <AddBack
        label="Add skill"
        options={skills.filter((k) => k.removed).map((k) => ({ id: k.id, name: k.name }))}
        onAdd={(skillId) => dispatch({ type: "setSkillRemoved", skillId, removed: false })}
      />
    </div>
  );
}

// A dashed chip that opens the hidden projects or skills as more dashed chips; click one to add it back.
// Renders nothing when there's nothing hidden.
function AddBack({
  label,
  options,
  onAdd,
}: {
  label: string;
  options: { id: string; name: string }[];
  onAdd: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!options.length) return null;
  return (
    <>
      <button className="rdb-chip rdb-chip--add" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Plus className="rdb-icon" width={14} height={14} aria-hidden /> {label} · {options.length} hidden
      </button>
      {open &&
        options.map((o) => (
          <button key={o.id} className="rdb-chip rdb-chip--add" onClick={() => onAdd(o.id)}>
            <Plus className="rdb-icon" width={14} height={14} aria-hidden /> {o.name}
          </button>
        ))}
    </>
  );
}

// The AI suggested a different title for this role: yours or theirs, yours to start.
function TitleChoice({ item, onSelect }: { item: TailoredItem; onSelect: (side: Side) => void }) {
  const pill = (side: Side, text: string, tag: string) => {
    const on = item.titleSelected === side;
    return (
      <button className="ws-tp" role="radio" aria-checked={on} onClick={() => onSelect(side)}>
        {on && <Check className="rdb-icon" width={14} height={14} aria-hidden />}
        {text} <span>{tag}</span>
      </button>
    );
  };
  return (
    <div className="ws-titlepick" role="radiogroup" aria-label="Job title on this resume">
      <span className="rdb-small rdb-muted">Title on this resume</span>
      {pill("original", item.title, "yours")}
      {pill("ai", item.aiTitle!, "suggested")}
    </div>
  );
}
