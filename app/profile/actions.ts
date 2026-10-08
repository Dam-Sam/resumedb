"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { ITEM_TYPES, LINK_TYPES, type ItemType } from "@/lib/ai/schemas";
import * as repo from "@/lib/profile/repository";
import { createClient } from "@/lib/supabase/server";

// Every profile change goes through here: check who's signed in, write through
// the repository (RLS keeps it to their own rows), then refresh the page.

export type ActionResult = { error?: string };

async function run(change: (supabase: SupabaseClient, userId: string) => Promise<void>): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };
  try {
    await change(supabase, user.id);
  } catch (err) {
    console.error("profile action failed:", err);
    return { error: friendly(err) };
  }
  refresh();
  return {};
}

function friendly(err: unknown) {
  const msg = err instanceof Error ? err.message : "";
  if (msg.includes("end_date")) return "The end date can't be before the start date.";
  if (msg.includes("skills_user_id_name_key")) return "You already have a skill with that name.";
  return "Couldn't save that. Please try again.";
}

// Empty text → null.
const opt = (v: string | null | undefined) => (v?.trim() ? v.trim() : null);

export async function saveContact(fields: repo.ContactFields) {
  return run((sb, uid) =>
    repo.updateContact(sb, uid, {
      full_name: fields.full_name.trim(),
      email: opt(fields.email),
      phone: opt(fields.phone),
      location: opt(fields.location),
    }),
  );
}

export async function saveBackground(body: string) {
  return run((sb, uid) => repo.saveBackground(sb, uid, body));
}

const linkType = (t: string) => ((LINK_TYPES as readonly string[]).includes(t) ? t : "other");

export async function addLink(type: string, url: string) {
  if (!url.trim()) return { error: "Enter a URL." };
  return run((sb, uid) => repo.addLink(sb, uid, linkType(type), url.trim()));
}

export async function saveLink(id: string, type: string, url: string) {
  if (!url.trim()) return { error: "Enter a URL, or remove the link." };
  return run((sb) => repo.updateLink(sb, id, linkType(type), url.trim()));
}

export async function removeLink(id: string) {
  return run((sb) => repo.removeLink(sb, id));
}

export async function addItem(type: ItemType, title: string) {
  if (!ITEM_TYPES.includes(type)) return { error: "Unknown section." };
  if (!title.trim()) return { error: "Give the entry a title." };
  return run((sb, uid) => repo.addItem(sb, uid, type, title.trim()));
}

export async function saveItem(id: string, fields: repo.ItemFields) {
  if (!fields.title.trim()) return { error: "The title can't be empty." };
  const details = Object.fromEntries(
    Object.entries(fields.details).filter(([, v]) => v?.trim()).map(([k, v]) => [k, v.trim()]),
  );
  return run((sb) =>
    repo.updateItem(sb, id, {
      title: fields.title.trim(),
      organization: opt(fields.organization),
      location: opt(fields.location),
      start_date: fields.start_date || null,
      end_date: fields.is_current ? null : fields.end_date || null,
      is_current: fields.is_current,
      description: opt(fields.description),
      details,
    }),
  );
}

export async function removeItem(id: string) {
  return run((sb) => repo.removeItem(sb, id));
}

export async function addBullet(itemId: string, body: string) {
  if (!body.trim()) return { error: "Write the bullet first." };
  return run((sb) => repo.addBullet(sb, itemId, body.trim()));
}

export async function saveBullet(id: string, body: string) {
  if (!body.trim()) return { error: "A bullet can't be empty. Remove it instead." };
  return run((sb) => repo.updateBullet(sb, id, body.trim()));
}

export async function removeBullet(id: string) {
  return run((sb) => repo.removeBullet(sb, id));
}

export async function addSkill(name: string, category: string) {
  if (!name.trim()) return { error: "Enter a skill." };
  return run((sb, uid) => repo.addSkill(sb, uid, name.trim(), opt(category)));
}

export async function saveSkill(id: string, name: string, category: string) {
  if (!name.trim()) return { error: "A skill needs a name." };
  return run((sb) => repo.updateSkill(sb, id, name.trim(), opt(category)));
}

export async function removeSkill(id: string) {
  return run((sb) => repo.removeSkill(sb, id));
}

export async function addItemSkill(itemId: string, name: string) {
  if (!name.trim()) return {};
  return run((sb, uid) => repo.addItemSkill(sb, uid, itemId, name.trim()));
}

export async function removeItemSkill(itemId: string, name: string) {
  return run((sb, uid) => repo.removeItemSkill(sb, uid, itemId, name));
}
