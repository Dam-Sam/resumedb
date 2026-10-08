import { formatRange } from "@/lib/profile/sections";
import { sideText, type TailoredResume } from "./types";

// The resume exactly as it will be downloaded: plain text, no choices left.
export interface FinalItem {
  type: string;
  title: string;
  organization: string | null;
  location: string | null;
  dates: string | null;
  url: string | null;
  tech: string[];
  description: string | null;
  bullets: string[];
}

export type FinalSection =
  | { kind: "summary"; title: string; text: string }
  | { kind: "skills"; title: string; groups: { label: string; names: string[] }[] }
  | { kind: "items"; title: string; items: FinalItem[] };

export interface FinalResume {
  name: string;
  contactParts: string[];
  sections: FinalSection[];
}

// Workspace state → what goes in the file: sections in contents order, each
// bullet's selected (and edited) text, removed bullets dropped, summary only if chosen.
export function buildFinalResume(state: TailoredResume): FinalResume {
  const { contact } = state;
  const sections: FinalSection[] = [];

  for (const s of state.sections) {
    if (s.kind === "summary") {
      const text = state.summary?.trim();
      if (text) sections.push({ kind: "summary", title: s.title, text });
    } else if (s.kind === "skills") {
      // Group by category, categories in the order of their most relevant skill.
      const groups = new Map<string, string[]>();
      for (const skill of s.skills) {
        const label = skill.category ?? "Skills";
        groups.set(label, [...(groups.get(label) ?? []), skill.name]);
      }
      if (groups.size) {
        sections.push({ kind: "skills", title: s.title, groups: [...groups].map(([label, names]) => ({ label, names })) });
      }
    } else {
      sections.push({
        kind: "items",
        title: s.title,
        // Items with every bullet removed still appear, by title.
        items: s.items.map((item) => ({
          type: item.type,
          title: item.title,
          organization: item.organization,
          location: item.location,
          dates: formatRange(item.start_date, item.end_date, item.is_current),
          url: item.details.url ?? null,
          tech: item.skills,
          description: item.description,
          bullets: item.bullets
            .filter((b) => !b.removed)
            .map((b) => sideText(b, b.selected).trim())
            .filter(Boolean),
        })),
      });
    }
  }

  return {
    name: contact?.full_name || "",
    contactParts: [contact?.email, contact?.phone, ...state.links.map((l) => l.url)].filter(
      (x): x is string => !!x,
    ),
    sections,
  };
}

// {FullName}_{Company}_{JobTitle}, letters and digits only within each part.
export function resumeFileName(state: TailoredResume, ext: "docx" | "pdf") {
  const part = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, "");
  const parts = [state.contact?.full_name || "Resume", state.company, state.jobTitle].map(part).filter(Boolean);
  return `${parts.join("_")}.${ext}`;
}
