import type { FinalResume } from "@/lib/resume/final";

// Read-only view of the resume exactly as it was downloaded.
export default function FrozenResume({ resume }: { resume: FinalResume }) {
  return (
    <article className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
      <header>
        <h2 className="text-xl font-semibold">{resume.name || "Your name"}</h2>
        <p className="text-sm text-gray-600">{resume.contactParts.join(" · ")}</p>
      </header>
      {resume.sections.map((section, i) => (
        <section key={i}>
          <h3 className="mb-2 border-b border-gray-200 pb-1 text-sm font-semibold uppercase tracking-wide text-gray-700">
            {section.title}
          </h3>
          {section.kind === "summary" && <p className="text-sm">{section.text}</p>}
          {section.kind === "skills" && (
            <ul className="space-y-1 text-sm">
              {section.groups.map((g) => (
                <li key={g.label}>
                  <span className="font-medium">{g.label}:</span> {g.names.join(", ")}
                </li>
              ))}
            </ul>
          )}
          {section.kind === "items" && (
            <div className="space-y-4">
              {section.items.map((item, j) => (
                <div key={j} className="text-sm">
                  <div className="flex flex-wrap justify-between gap-x-4">
                    <span className="font-medium">
                      {item.title}
                      {item.organization && <span className="font-normal text-gray-600"> · {item.organization}</span>}
                    </span>
                    <span className="text-gray-500">{[item.location, item.dates].filter(Boolean).join(" · ")}</span>
                  </div>
                  {item.tech.length > 0 && <p className="italic text-gray-600">{item.tech.join(", ")}</p>}
                  {item.description && <p className="mt-1">{item.description}</p>}
                  {item.bullets.length > 0 && (
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {item.bullets.map((b, k) => (
                        <li key={k}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </article>
  );
}
