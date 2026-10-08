import type { KeySummary } from "@/lib/resume/types";

// What the posting is asking for, pulled out by the AI.
export default function KeySummaryPanel({ keySummary }: { keySummary: KeySummary }) {
  const groups: [string, string[]][] = [
    ["Key skills", keySummary.skills],
    ["Experience", keySummary.experience],
    ["Culture", keySummary.culture],
  ];
  return (
    <aside className="space-y-5 rounded-lg border border-gray-200 bg-white p-4 text-sm">
      <h2 className="font-semibold">What the posting wants</h2>
      {groups.map(([title, list]) => (
        <div key={title}>
          <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</h3>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {list.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}
