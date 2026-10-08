"use client";

import { useReducer } from "react";
import { formatRange } from "@/lib/profile/sections";
import type { TailoredItem, TailorResponse } from "@/lib/resume/types";
import { workspaceReducer, type WorkspaceAction } from "@/lib/resume/workspace-reducer";
import BulletRow from "./BulletRow";
import KeySummaryPanel from "./KeySummaryPanel";
import SummaryEditor from "./SummaryEditor";

// Contents on the left, the resume with side-by-side bullets in the middle,
// what the posting wants on the right.
export default function Workspace({ data, onStartOver }: { data: TailorResponse; onStartOver: () => void }) {
  const [resume, dispatch] = useReducer(workspaceReducer, data.resume);
  const { contact } = resume;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          {resume.jobTitle} <span className="font-normal text-gray-500">at {resume.company}</span>
        </h1>
        <button onClick={onStartOver} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">
          New tailoring
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[11rem_minmax(0,1fr)_16rem]">
        <nav aria-label="Contents" className="text-sm">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Contents</h2>
          <ol className="space-y-1">
            {resume.sections.map((s) => (
              <li key={s.key}>
                <a href={`#section-${s.key}`} className="block rounded px-2 py-1 hover:bg-gray-100">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

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
                    <Item key={item.id} item={item} dispatch={dispatch} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </article>

        <KeySummaryPanel keySummary={resume.keySummary} />
      </div>
    </div>
  );
}

function Item({ item, dispatch }: { item: TailoredItem; dispatch: (a: WorkspaceAction) => void }) {
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
            <BulletRow key={b.id} bullet={b} dispatch={dispatch} />
          ))}
      </div>
    </div>
  );
}
