import type { ItemType } from "@/lib/ai/schemas";

export type Side = "original" | "ai";

export interface TailoredBullet {
  id: string;
  original: string;
  // null when there's no AI version (a bullet swapped in with Replace): shown as one column.
  ai: string | null;
  selected: Side;
  edited: { original?: string; ai?: string };
  removed: boolean;
}

export interface TailoredItem {
  id: string;
  type: ItemType;
  title: string;
  organization: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  details: Record<string, string>;
  // Skills used on this item, shown as the italic tech line in downloads.
  skills: string[];
  bullets: TailoredBullet[];
}

export interface TailoredSkill {
  id: string;
  name: string;
  category: string | null;
}

export type TailoredSection =
  | { key: "summary"; title: string; kind: "summary" }
  | { key: "skills"; title: string; kind: "skills"; skills: TailoredSkill[] }
  | { key: string; title: string; kind: "items"; items: TailoredItem[] };

export interface KeySummary {
  skills: string[];
  experience: string[];
  culture: string[];
}

// Everything the workspace shows. Lives only in browser memory.
export interface TailoredResume {
  company: string;
  jobTitle: string;
  contact: { full_name: string; email: string | null; phone: string | null; location: string | null } | null;
  links: { type: string; url: string }[];
  summary: string | null;
  keySummary: KeySummary;
  sections: TailoredSection[];
}

// The tailoring form; kept so Retry can resend it.
export interface TailorInput {
  company: string;
  jobTitle: string;
  jobDescription: string;
  includeSummary: boolean;
}

// What /api/tailor sends back.
export interface TailorResponse {
  resume: TailoredResume;
  // Every profile bullet per item, for the Replace popup.
  profileBulletsByItem: Record<string, { id: string; body: string }[]>;
}

// The text a bullet currently shows on a given side, including edits.
export function sideText(b: TailoredBullet, side: Side) {
  return b.edited[side] ?? (side === "ai" ? (b.ai ?? b.original) : b.original);
}
