import type { SupabaseClient } from "@supabase/supabase-js";
import type { ItemType, ParsedResume } from "@/lib/ai/schemas";

// Every profile read and write goes through here. It always uses the signed-in
// user's Supabase client, so Row Level Security limits it to their own rows.

export interface ProfileItem {
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
  bullets: { id: string; body: string }[];
  skills: string[];
}

export interface Profile {
  contact: {
    full_name: string;
    email: string | null;
    phone: string | null;
    location: string | null;
  } | null;
  links: { id: string; type: string; url: string }[];
  background: string | null;
  items: ProfileItem[];
  skills: { id: string; name: string; category: string | null }[];
}

export async function loadProfile(supabase: SupabaseClient, userId: string): Promise<Profile> {
  const [contact, links, background, items, skills] = await Promise.all([
    supabase.from("contact_info").select("full_name, email, phone, location").eq("user_id", userId).maybeSingle(),
    supabase.from("profile_links").select("id, type, url").eq("user_id", userId),
    supabase
      .from("profile_summaries")
      .select("body")
      .eq("user_id", userId)
      .eq("kind", "background")
      .maybeSingle(),
    supabase
      .from("profile_items")
      .select("*, bullets(id, body, created_at), item_skills(skills(name))")
      .eq("user_id", userId)
      .order("start_date", { ascending: false, nullsFirst: false })
      .order("created_at")
      .order("created_at", { referencedTable: "bullets" }),
    supabase.from("skills").select("id, name, category").eq("user_id", userId).order("name"),
  ]);

  for (const r of [contact, links, background, items, skills]) {
    if (r.error) throw new Error(r.error.message);
  }

  return {
    contact: contact.data,
    links: links.data ?? [],
    background: background.data?.body ?? null,
    items: (items.data ?? []).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      organization: row.organization,
      location: row.location,
      start_date: row.start_date,
      end_date: row.end_date,
      is_current: row.is_current,
      description: row.description,
      details: row.details ?? {},
      bullets: (row.bullets ?? []).map((b: { id: string; body: string }) => ({ id: b.id, body: b.body })),
      skills: (row.item_skills ?? [])
        .map((s: { skills: { name: string } | null }) => s.skills?.name)
        .filter(Boolean),
    })),
    skills: skills.data ?? [],
  };
}

export async function hasProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("contact_info").select("user_id").eq("user_id", userId).maybeSingle();
  return data != null;
}

// One background per user: replace whatever is there.
export async function saveBackground(supabase: SupabaseClient, userId: string, body: string) {
  await check(
    supabase.from("profile_summaries").delete().eq("user_id", userId).eq("kind", "background"),
  );
  if (body.trim()) {
    await check(
      supabase.from("profile_summaries").insert({ user_id: userId, kind: "background", body: body.trim() }),
    );
  }
}

// The unreadable-resume path: an empty profile the user fills in by hand.
export async function saveEmptyContact(supabase: SupabaseClient, userId: string) {
  // ignoreDuplicates: if parsing got as far as saving a name, keep it.
  await check(
    supabase.from("contact_info").upsert({ user_id: userId, full_name: "" }, { ignoreDuplicates: true }),
  );
}

// Writes a freshly parsed resume. Sequential inserts, no transaction (see spec:
// "What Was Simplified"). Order: contact, links, items, bullets, skills, item_skills.
export async function saveParsedProfile(supabase: SupabaseClient, userId: string, parsed: ParsedResume) {
  const { contact, links, items, skills } = parsed;

  await check(supabase.from("contact_info").upsert({ user_id: userId, ...contact }));

  if (links.length) {
    await check(supabase.from("profile_links").insert(links.map((l) => ({ user_id: userId, ...l }))));
  }

  // Rows inserted together share one now(), so give each a distinct created_at
  // to keep the resume's original order.
  const t0 = Date.now();
  const stamp = (i: number) => new Date(t0 + i).toISOString();

  const { data: itemRows, error: itemErr } = await supabase
    .from("profile_items")
    .insert(
      items.map((it, i) => {
        const start = toDate(it.start_date);
        let end = it.is_current ? null : toDate(it.end_date);
        if (start && end && end < start) end = null;
        return {
          user_id: userId,
          type: it.type,
          title: it.title,
          organization: it.organization,
          location: it.location,
          start_date: start,
          end_date: end,
          is_current: it.is_current,
          description: it.description,
          details: compact({ url: it.url, field: it.field_of_study, gpa: it.gpa }),
          created_at: stamp(i),
        };
      }),
    )
    .select("id");
  if (itemErr) throw new Error(itemErr.message);
  const itemIds = (itemRows ?? []).map((r) => r.id as string);

  const bulletRows = items.flatMap((it, i) =>
    it.bullets.filter((b) => b.trim()).map((body) => ({ item_id: itemIds[i], body: body.trim() })),
  );
  if (bulletRows.length) {
    await check(supabase.from("bullets").insert(bulletRows.map((b, i) => ({ ...b, created_at: stamp(i) }))));
  }

  // Every skill named anywhere, deduplicated case-insensitively.
  const byName = new Map<string, { name: string; category: string | null }>();
  for (const s of skills) collectSkill(byName, s.name, s.category);
  for (const it of items) for (const name of it.skills) collectSkill(byName, name, null);

  const skillIds = new Map<string, string>();
  if (byName.size) {
    const { data, error } = await supabase
      .from("skills")
      .upsert(
        [...byName.values()].map((s) => ({ user_id: userId, ...s })),
        { onConflict: "user_id,name" },
      )
      .select("id, name");
    if (error) throw new Error(error.message);
    for (const s of data ?? []) skillIds.set(s.name.toLowerCase(), s.id);
  }

  const itemSkillRows: { item_id: string; skill_id: string }[] = [];
  items.forEach((it, i) => {
    const ids = new Set(it.skills.map((name) => skillIds.get(name.trim().toLowerCase())));
    for (const skill_id of ids) if (skill_id) itemSkillRows.push({ item_id: itemIds[i], skill_id });
  });
  if (itemSkillRows.length) {
    await check(supabase.from("item_skills").insert(itemSkillRows));
  }
}

function collectSkill(map: Map<string, { name: string; category: string | null }>, raw: string, category: string | null) {
  const name = raw.trim();
  if (!name) return;
  const key = name.toLowerCase();
  const existing = map.get(key);
  if (!existing) map.set(key, { name, category });
  else if (!existing.category && category) existing.category = category;
}

// Accepts YYYY-MM-DD, YYYY-MM or YYYY; anything else becomes null.
function toDate(value: string | null): string | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (!m) return null;
  const date = `${m[1]}-${m[2] ?? "01"}-${m[3] ?? "01"}`;
  return Number.isNaN(Date.parse(date)) ? null : date;
}

function compact(obj: Record<string, string | null>) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null && v !== ""));
}

async function check(query: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await query;
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Profile editing (used by app/profile/actions.ts)
// ---------------------------------------------------------------------------

export interface ContactFields {
  full_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
}

export async function updateContact(supabase: SupabaseClient, userId: string, fields: ContactFields) {
  await check(supabase.from("contact_info").upsert({ user_id: userId, ...fields }));
}

export async function addLink(supabase: SupabaseClient, userId: string, type: string, url: string) {
  await check(supabase.from("profile_links").insert({ user_id: userId, type, url }));
}

export async function updateLink(supabase: SupabaseClient, id: string, type: string, url: string) {
  await check(supabase.from("profile_links").update({ type, url }).eq("id", id));
}

export async function removeLink(supabase: SupabaseClient, id: string) {
  await check(supabase.from("profile_links").delete().eq("id", id));
}

export interface ItemFields {
  title: string;
  organization: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  details: Record<string, string>;
}

export async function addItem(supabase: SupabaseClient, userId: string, type: ItemType, title: string) {
  await check(supabase.from("profile_items").insert({ user_id: userId, type, title }));
}

export async function updateItem(supabase: SupabaseClient, id: string, fields: ItemFields) {
  await check(supabase.from("profile_items").update(fields).eq("id", id));
}

// Bullets and skill links go with it (on delete cascade).
export async function removeItem(supabase: SupabaseClient, id: string) {
  await check(supabase.from("profile_items").delete().eq("id", id));
}

export async function addBullet(supabase: SupabaseClient, itemId: string, body: string) {
  await check(supabase.from("bullets").insert({ item_id: itemId, body }));
}

export async function updateBullet(supabase: SupabaseClient, id: string, body: string) {
  await check(supabase.from("bullets").update({ body }).eq("id", id));
}

export async function removeBullet(supabase: SupabaseClient, id: string) {
  await check(supabase.from("bullets").delete().eq("id", id));
}

// Finds or creates the skill by name (case-insensitive) and returns its id.
async function ensureSkill(supabase: SupabaseClient, userId: string, name: string, category: string | null = null) {
  const { data: existing, error } = await supabase
    .from("skills")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", name.replace(/[%_\\]/g, "\\$&"))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (existing) return existing.id as string;
  const { data, error: insertErr } = await supabase
    .from("skills")
    .insert({ user_id: userId, name, category })
    .select("id")
    .single();
  if (insertErr) throw new Error(insertErr.message);
  return data.id as string;
}

export async function addSkill(supabase: SupabaseClient, userId: string, name: string, category: string | null) {
  await ensureSkill(supabase, userId, name, category);
}

export async function updateSkill(supabase: SupabaseClient, id: string, name: string, category: string | null) {
  await check(supabase.from("skills").update({ name, category }).eq("id", id));
}

export async function removeSkill(supabase: SupabaseClient, id: string) {
  await check(supabase.from("skills").delete().eq("id", id));
}

export async function addItemSkill(supabase: SupabaseClient, userId: string, itemId: string, name: string) {
  const skillId = await ensureSkill(supabase, userId, name);
  await check(
    supabase.from("item_skills").upsert({ item_id: itemId, skill_id: skillId }, { ignoreDuplicates: true }),
  );
}

export async function removeItemSkill(supabase: SupabaseClient, userId: string, itemId: string, name: string) {
  const { data } = await supabase.from("skills").select("id").eq("user_id", userId).eq("name", name).maybeSingle();
  if (data) await check(supabase.from("item_skills").delete().eq("item_id", itemId).eq("skill_id", data.id));
}
