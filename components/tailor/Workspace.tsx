"use client";

import { useReducer, useState } from "react";
import { formatRange } from "@/lib/profile/sections";
import type { TailoredItem, TailorResponse } from "@/lib/resume/types";
import { workspaceReducer, type WorkspaceAction } from "@/lib/resume/workspace-reducer";
import BulletRow from "./BulletRow";
import DownloadButtons from "./DownloadButtons";
import KeySummaryPanel from "./KeySummaryPanel";
import ReplaceDialog from "./ReplaceDialog";
import SummaryEditor from "./SummaryEditor";
import TableOfContents from "./TableOfContents";

// Contents on the left, the resume with side-by-side bullets in the middle,
// what the posting wants on the right.
export default function Workspace({ data, onStartOver }: { data: TailorResponse; onStartOver: () => void }) {
  const [resume, dispatch] = useReducer(workspaceReducer, data.resume);
  const [replacing, setReplacing] = useState<{ item: TailoredItem; bulletId: string } | null>(null);
  const { contact } = resume;

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
          <DownloadButtons resume={resume} />
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
              {section.kind === "skills" && (
                <p className="text-sm">{section.skills.map((s) => s.name).join(", ")}</p>
              )}
              {section.kind === "items" && (
                <div className="space-y-6">
                  {section.items.map((item) => (
                    <Item
                      key={item.id}
                      item={item}
                      dispatch={dispatch}
                      onReplace={(bulletId) => setReplacing({ item, bulletId })}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </article>

        <KeySummaryPanel keySummary={resume.keySummary} />
      </div>

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

function Item({
  item,
  dispatch,
  onReplace,
}: {
  item: TailoredItem;
  dispatch: (a: WorkspaceAction) => void;
  onReplace: (bulletId: string) => void;
}) {
  const dates = formatRange(item.start_date, item.end_date, item.is_current);
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-medium">
          {item.title}
          {item.organization && <span className="font-normal text-gray-600"> · {item.organization}</span>}
        </h4>
        {dates && <span className="text-sm text-gray-500">{dates}</span>}
      </div>
      {item.description && <p className="mt-1 text-sm text-gray-700">{item.description}</p>}
      <div className="mt-3 space-y-4">
        {item.bullets
          .filter((b) => !b.removed)
          .map((b) => (
            <BulletRow key={b.id} bullet={b} dispatch={dispatch} onReplace={() => onReplace(b.id)} />
          ))}
      </div>
    </div>
  );
}
