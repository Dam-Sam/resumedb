import type { SupabaseClient } from "@supabase/supabase-js";
import { getLLM } from "@/lib/llm";
import { withRunLog } from "@/lib/llm/log";
import type { Profile } from "@/lib/profile/repository";
import { serializeProfile } from "@/lib/profile/serialize";
import { SECTIONS } from "@/lib/profile/sections";
import {
  BULLET_LIMIT,
  PROJECT_TYPES,
  RETITLABLE_TYPES,
  TRIMMED_TYPES,
  type TailoredItem,
  type TailoredResume,
  type TailoredSection,
  type TailorInput,
  type TailorResponse,
} from "@/lib/resume/types";
import { tailorMessage } from "./messages";
import { getActivePrompt } from "./prompts";
import { TailoringResult } from "./schemas";

// Profile + posting → Claude → validated TailoredResume.
export async function tailor(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile,
  input: TailorInput,
): Promise<TailorResponse> {
  const active = await getActivePrompt(supabase, "tailor");
  const prompt = tailorMessage({ profileText: serializeProfile(profile), ...input });
  const { data } = await withRunLog(
    supabase,
    userId,
    { purpose: "tailor", promptId: active.id, promptVersion: active.label, input: active.system + prompt },
    () => getLLM().generateObject({ system: active.system, prompt, schema: TailoringResult }),
  );

  return {
    resume: assemble(profile, data, input),
    profileBulletsByItem: Object.fromEntries(profile.items.map((i) => [i.id, i.bullets])),
  };
}

// Builds the resume from the user's real rows, using the model's answer only as
// ordering and rewrite text. This is where "nothing invented" is enforced:
// IDs that aren't in the profile are dropped, and anything the model skipped
// is appended in its original order, so every real item and bullet shows up once.
export function assemble(profile: Profile, result: TailoringResult, input: TailorInput): TailoredResume {
  const itemOrder = rankIds(result.itemOrder, profile.items.map((i) => i.id), "item");
  const skillOrder = rankIds(result.skillOrder, profile.skills.map((s) => s.id), "skill");

  const rewrites = new Map<string, string>();
  for (const r of result.bulletRewrites) {
    const id = stripPrefix(r.bulletId, "bullet");
    if (!rewrites.has(id) && r.rewrite.trim()) rewrites.set(id, r.rewrite.trim());
  }

  const bulletRank = new Map(
    rankIds(result.bulletOrder, profile.items.flatMap((i) => i.bullets.map((b) => b.id)), "bullet").map((id, n) => [id, n]),
  );
  const droppedProjects = new Set(result.droppedProjectIds.map((id) => stripPrefix(id, "item")));
  const droppedSkills = new Set(result.droppedSkillIds.map((id) => stripPrefix(id, "skill")));

  const titles = new Map<string, string>();
  for (const r of result.titleRewrites) {
    const id = stripPrefix(r.itemId, "item");
    if (!titles.has(id) && r.title.trim()) titles.set(id, r.title.trim());
  }

  const itemsById = new Map(profile.items.map((i) => [i.id, i]));
  const orderedItems: TailoredItem[] = itemOrder.map((id) => {
    const item = itemsById.get(id)!;
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      // Only roles get a suggestion, and only when it actually differs.
      aiTitle:
        RETITLABLE_TYPES.includes(item.type) && titles.get(item.id) && titles.get(item.id) !== item.title
          ? titles.get(item.id)!
          : null,
      titleSelected: "original",
      organization: item.organization,
      location: item.location,
      start_date: item.start_date,
      end_date: item.end_date,
      is_current: item.is_current,
      description: item.description,
      details: item.details,
      skills: item.skills,
      // Most relevant first. Roles and projects show their top few; the rest
      // start hidden and can be added back. Education etc. keep every bullet.
      bullets: [...item.bullets]
        .sort((a, b) => bulletRank.get(a.id)! - bulletRank.get(b.id)!)
        .map((b, n) => ({
          id: b.id,
          original: b.body,
          // No rewrite from the model: show the original on both sides.
          ai: rewrites.get(b.id) ?? b.body,
          selected: "original" as const,
          edited: {},
          removed: TRIMMED_TYPES.includes(item.type) && n >= BULLET_LIMIT,
          rank: bulletRank.get(b.id)!,
        })),
      removed: PROJECT_TYPES.includes(item.type) && droppedProjects.has(item.id),
    };
  });

  const summary = input.includeSummary ? (result.summary?.trim() || null) : null;
  const skillsById = new Map(
    profile.skills.map((s) => [s.id, { id: s.id, name: s.name, category: s.category, removed: droppedSkills.has(s.id) }]),
  );

  // Default section order: Summary? → Experience → Projects → Skills → Education → others.
  const sections: TailoredSection[] = [];
  if (summary !== null) sections.push({ key: "summary", title: "Summary", kind: "summary" });
  for (const s of SECTIONS) {
    if (s.key === "education" && skillOrder.length) {
      sections.push({ key: "skills", title: "Skills", kind: "skills", skills: skillOrder.map((id) => skillsById.get(id)!) });
    }
    const items = orderedItems.filter((i) => s.types.includes(i.type));
    if (items.length) sections.push({ key: s.key, title: s.title, kind: "items", items });
  }
  if (skillOrder.length && !sections.some((s) => s.kind === "skills")) {
    sections.push({ key: "skills", title: "Skills", kind: "skills", skills: skillOrder.map((id) => skillsById.get(id)!) });
  }

  return {
    company: input.company,
    jobTitle: input.jobTitle,
    contact: profile.contact,
    links: profile.links.map(({ type, url }) => ({ type, url })),
    summary,
    keySummary: result.keySummary,
    sections,
  };
}

// The model's ranking, keeping only real IDs (once each), then anything it left out.
function rankIds(ranked: string[], known: string[], prefix: string) {
  const knownSet = new Set(known);
  const out: string[] = [];
  for (const raw of ranked) {
    const id = stripPrefix(raw, prefix);
    if (knownSet.has(id) && !out.includes(id)) out.push(id);
  }
  for (const id of known) if (!out.includes(id)) out.push(id);
  return out;
}

// The profile text labels IDs like "[bullet:abc]"; accept the label if the model copies it.
function stripPrefix(raw: string, prefix: string) {
  return raw.trim().replace(/^\[|\]$/g, "").replace(new RegExp(`^${prefix}:`), "");
}
