import { Check, X } from "lucide-react";
import type { KeySummary } from "@/lib/resume/types";

// What the posting is asking for, pulled out by the AI. Key skills are checked
// against the skills currently showing in the resume.
export default function KeySummaryPanel({
  keySummary,
  resumeSkills,
  jobDescription,
}: {
  keySummary: KeySummary;
  resumeSkills: string[];
  jobDescription: string;
}) {
  const have = new Set(resumeSkills.map((s) => s.trim().toLowerCase()));
  const lists: [string, string[]][] = [
    ["Experience", keySummary.experience],
    ["Culture", keySummary.culture],
  ];
  return (
    <aside className="ws-ks">
      <h2 className="rdb-h3">What the posting wants</h2>
      <p className="rdb-small rdb-muted" style={{ margin: "4px 0 16px" }}>
        Pulled from the job description.
      </p>
      <p className="rdb-eyebrow">Key skills</p>
      <ul className="ws-kskills">
        {keySummary.skills.map((k) => {
          const ok = have.has(k.trim().toLowerCase());
          return (
            <li key={k} className={ok ? "have" : "gap"}>
              {ok ? (
                <Check className="rdb-icon" width={14} height={14} role="img" aria-label="In your resume:" />
              ) : (
                <X className="rdb-icon" width={14} height={14} role="img" aria-label="Not in your resume:" />
              )}
              {k}
            </li>
          );
        })}
      </ul>
      <p className="rdb-small rdb-muted" style={{ margin: "8px 0 0" }}>
        A check means the skill is in this resume.
      </p>
      {lists.map(([title, list]) =>
        list.length ? (
          <div key={title}>
            <p className="rdb-eyebrow" style={{ marginTop: 20 }}>
              {title}
            </p>
            <ul className="ws-kl">
              {list.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
      <details className="ws-jd">
        <summary>Job description</summary>
        <p className="rdb-small rdb-muted" style={{ whiteSpace: "pre-wrap", maxHeight: 280, overflow: "auto" }}>
          {jobDescription}
        </p>
      </details>
    </aside>
  );
}
