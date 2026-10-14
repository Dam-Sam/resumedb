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
  // Relevance to the posting, 0 = most relevant. Used to trim to one page.
  rank: number;
}

export interface TailoredItem {
  id: string;
  type: ItemType;
  // Your title from the profile, and the AI's suggestion (null when it had none).
  title: string;
  aiTitle: string | null;
  titleSelected: Side;
  organization: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  details: Record<string, string>;
  // Skills used on this item, shown as the italic tech line in downloads.
  skills: string[];
  // Bullets in relevance order; only the top few start visible.
  bullets: TailoredBullet[];
  // A hidden project (dropped by the AI or by you); can be added back.
  removed: boolean;
}

export interface TailoredSkill {
  id: string;
  name: string;
  category: string | null;
  removed: boolean;
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

// Items that start with only their most relevant bullets showing.
export const BULLET_LIMIT = 3;
export const TRIMMED_TYPES: ItemType[] = ["work", "volunteer", "research", "project", "open_source"];
// Items that can be hidden as a whole. Jobs and education always stay.
export const PROJECT_TYPES: ItemType[] = ["project", "open_source"];

// Roles the AI may suggest a new title for. Project, degree and award names stay as they are.
export const RETITLABLE_TYPES: ItemType[] = ["work", "volunteer", "research"];

// The title an item currently shows.
export function itemTitle(item: TailoredItem) {
  return item.titleSelected === "ai" && item.aiTitle ? item.aiTitle : item.title;
}

// The text a bullet currently shows on a given side, including edits.
export function sideText(b: TailoredBullet, side: Side) {
  return b.edited[side] ?? (side === "ai" ? (b.ai ?? b.original) : b.original);
}
