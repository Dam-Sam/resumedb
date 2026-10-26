import type { FinalResume } from "@/lib/resume/final";

// Read-only view of the resume exactly as it was downloaded, drawn as the printed page.
export default function FrozenResume({ resume }: { resume: FinalResume }) {
  return (
    <article className="rdb-sheet">
      <h3>{resume.name || "Your name"}</h3>
      <p className="c">{resume.contactParts.join(" · ")}</p>
      {resume.sections.map((section, i) => (
        <section key={i}>
          <h4>{section.title}</h4>
          {section.kind === "summary" && <p>{section.text}</p>}
          {section.kind === "skills" && (
            <p>
              {section.groups.map((g, k) => (
                <span key={g.label}>
                  {k > 0 && " · "}
                  <b>{g.label}:</b> {g.names.join(", ")}
                </span>
              ))}
            </p>
          )}
          {section.kind === "items" &&
            section.items.map((item, j) => (
              <div key={j}>
                <div className="it">
                  <span style={{ color: "inherit" }}>
                    <b>{item.title}</b>
                    {item.organization && <> · {item.organization}</>}
                  </span>
                  <span>{[item.location, item.dates].filter(Boolean).join(" · ")}</span>
                </div>
                {item.tech.length > 0 && <p className="tech">{item.tech.join(", ")}</p>}
                {item.description && <p>{item.description}</p>}
                {item.bullets.length > 0 && (
                  <ul>
                    {item.bullets.map((b, k) => (
                      <li key={k}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
        </section>
      ))}
    </article>
  );
}
