import type { ItemType } from "@/lib/ai/schemas";

// How item types group into resume sections, in default order.
export const SECTIONS: { key: string; title: string; types: ItemType[] }[] = [
  { key: "experience", title: "Experience", types: ["work", "volunteer", "research"] },
  { key: "projects", title: "Projects", types: ["project", "open_source"] },
  { key: "education", title: "Education", types: ["education"] },
  { key: "certifications", title: "Certifications", types: ["certification", "license"] },
  { key: "awards", title: "Awards", types: ["award"] },
  { key: "publications", title: "Publications", types: ["publication"] },
  { key: "languages", title: "Languages", types: ["language"] },
  { key: "other", title: "Other", types: ["other"] },
];

// "2024-05-01" → "May 2024"
export function formatMonth(date: string | null) {
  if (!date) return null;
  const [y, m] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatRange(start: string | null, end: string | null, isCurrent: boolean) {
  const from = formatMonth(start);
  const to = isCurrent ? "Present" : formatMonth(end);
  if (from && to) return `${from} – ${to}`;
  return from ?? to ?? null;
}
