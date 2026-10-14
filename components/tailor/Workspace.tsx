"use client";

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
import DownloadButtons from "./DownloadButtons";
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

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50/95 px-6 py-3 backdrop-blur">
        <h1 className="text-xl font-semibold">
          {resume.jobTitle} <span className="font-normal text-gray-500">at {resume.company}</span>
        </h1>
        <div className="flex items-center gap-2">
          <span
            aria-live="polite"
            className={`text-sm ${!fitting && pages !== null && pages > 1 ? "text-amber-700" : "text-gray-500"}`}
          >
            {fitting ? "Fitting to one page…" : pages === null ? "" : pages === 1 ? "1 page" : `${pages} pages`}
          </span>
          <DownloadButtons resume={resume} jobDescription={jobDescription} />
          <button onClick={onStartOver} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">
            New tailoring
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[11rem_minmax(0,1fr)_16rem]">
        <div>
          <div className="lg:sticky lg:top-6">
            <TableOfContents
              sections={resume.sections}
              onMove={(from, to) => dispatch({ type: "moveSection", from, to })}
            />
          </div>
        </div>

        <article className="space-y-8 rounded-lg border border-gray-200 bg-white p-6">
          <header>
            <h2 className="text-2xl font-semibold">{contact?.full_name || "Your name"}</h2>
            <p className="text-sm text-gray-600">
              {[contact?.email, contact?.phone, contact?.location, ...resume.links.map((l) => l.url)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </header>

          {resume.sections.map((section) => (
            <section key={section.key} id={`section-${section.key}`} className="scroll-mt-6">
              <h3 className="mb-3 border-b border-gray-200 pb-1 text-sm font-semibold uppercase tracking-wide">
                {section.title}
              </h3>
              {section.kind === "summary" && (
                <SummaryEditor
                  value={resume.summary ?? ""}
                  onChange={(text) => dispatch({ type: "editSummary", text })}
                />
              )}
              {section.kind === "skills" && <Skills skills={section.skills} dispatch={dispatch} />}
              {section.kind === "items" && (
                <div className="space-y-6">
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
                    label="Add project"
                    options={section.items.filter((i) => i.removed).map((i) => ({ id: i.id, name: itemTitle(i) }))}
                    onAdd={(itemId) => dispatch({ type: "setItemRemoved", itemId, removed: false })}
                  />
                </div>
              )}
            </section>
          ))}
        </article>

        <KeySummaryPanel keySummary={resume.keySummary} />
      </div>

      {adding && (
        <ReplaceDialog
          title="Add a bullet back"
          empty="Every bullet for this item is already showing."
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
          options={replaceOptions}
          onClose={() => setReplacing(null)}
          onPick={(bullet) => {
            dispatch({ type: "replace", bulletId: replacing.bulletId, with: bullet });
            setReplacing(null);
          }}
        />
      )}
    </div>
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
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-medium">
          {itemTitle(item)}
          {item.organization && <span className="font-normal text-gray-600"> · {item.organization}</span>}
        </h4>
        {dates && <span className="text-sm text-gray-500">{dates}</span>}
      </div>
      {item.aiTitle && (
        <TitleChoice
          item={item}
          onSelect={(side) => dispatch({ type: "selectTitle", itemId: item.id, side })}
        />
      )}
      {item.description && <p className="mt-1 text-sm text-gray-700">{item.description}</p>}
      <div className="mt-3 space-y-4">
        {item.bullets
          .filter((b) => !b.removed)
          .map((b) => (
            <BulletRow key={b.id} bullet={b} dispatch={dispatch} onReplace={() => onReplace(b.id)} />
          ))}
      </div>
      <div className="mt-3 flex gap-2 text-xs">
        {hidden > 0 && (
          <button onClick={onAdd} className="rounded border border-gray-300 bg-white px-2 py-1">
            Add bullet ({hidden} hidden)
          </button>
        )}
        {PROJECT_TYPES.includes(item.type) && (
          <button
            onClick={() => dispatch({ type: "setItemRemoved", itemId: item.id, removed: true })}
            className="rounded border border-gray-300 bg-white px-2 py-1"
          >
            Hide project
          </button>
        )}
      </div>
    </div>
  );
}

// Skills in relevance order. Irrelevant ones start hidden; × hides, the list adds back.
function Skills({ skills, dispatch }: { skills: TailoredSkill[]; dispatch: (a: WorkspaceAction) => void }) {
  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-2 text-sm">
        {skills
          .filter((k) => !k.removed)
          .map((k) => (
            <li key={k.id} className="flex items-center gap-1 rounded-full border border-gray-300 py-0.5 pl-3 pr-1">
              {k.name}
              <button
                onClick={() => dispatch({ type: "setSkillRemoved", skillId: k.id, removed: true })}
                aria-label={`Hide ${k.name}`}
                className="rounded-full px-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                ×
              </button>
            </li>
          ))}
      </ul>
      <AddBack
        label="Add skill"
        options={skills.filter((k) => k.removed).map((k) => ({ id: k.id, name: k.name }))}
        onAdd={(skillId) => dispatch({ type: "setSkillRemoved", skillId, removed: false })}
      />
    </div>
  );
}

// A picker for hidden projects or skills. Hidden when there's nothing to add.
function AddBack({
  label,
  options,
  onAdd,
}: {
  label: string;
  options: { id: string; name: string }[];
  onAdd: (id: string) => void;
}) {
  if (!options.length) return null;
  return (
    <select
      aria-label={label}
      value=""
      onChange={(e) => e.target.value && onAdd(e.target.value)}
      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
    >
      <option value="">
        {label} ({options.length} hidden)
      </option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

// The AI suggested a different title for this role: yours or theirs, yours to start.
function TitleChoice({ item, onSelect }: { item: TailoredItem; onSelect: (side: Side) => void }) {
  const option = (side: Side, label: string, text: string, tint: string) => {
    const selected = item.titleSelected === side;
    return (
      <button
        onClick={() => onSelect(side)}
        aria-pressed={selected}
        className={`rounded-md px-3 py-2 text-left text-sm ${tint} ${
          selected ? "border-2 border-gray-900" : "border border-gray-200 opacity-55"
        }`}
      >
        <span className="flex items-center justify-between gap-2 text-xs text-gray-600">
          {label}
          {selected && <span className="rounded bg-gray-900 px-1.5 py-0.5 font-medium text-white">Selected</span>}
        </span>
        <span className="mt-1 block font-medium">{text}</span>
      </button>
    );
  };
  return (
    <div className="mt-2 grid grid-cols-2 gap-3">
      {option("original", "Your title", item.title, "bg-rose-50")}
      {option("ai", "AI's suggested title", item.aiTitle!, "bg-emerald-50")}
    </div>
  );
}
