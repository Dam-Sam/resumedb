import type { Profile } from "./repository";

// Turns the profile into the text Claude sees when tailoring.
// Every item, bullet and skill carries its database ID so the answer can point back at them.
// Name, email, phone and links are never included.
export function serializeProfile(profile: Profile) {
  const lines: string[] = [];

  lines.push("BACKGROUND (the person in their own words):");
  lines.push(profile.background?.trim() || "(none)");
  lines.push("");

  lines.push("ITEMS:");
  for (const item of profile.items) {
    const where = [item.organization, item.location].filter(Boolean).join(", ");
    const when = [item.start_date?.slice(0, 7), item.is_current ? "present" : item.end_date?.slice(0, 7)]
      .filter(Boolean)
      .join(" to ");
    lines.push(`[item:${item.id}] ${item.type}: ${item.title}${where ? ` @ ${where}` : ""}${when ? ` (${when})` : ""}`);
    if (item.description) lines.push(`  description: ${item.description}`);
    for (const b of item.bullets) lines.push(`  - [bullet:${b.id}] ${b.body}`);
    if (item.skills.length) lines.push(`  skills used: ${item.skills.join(", ")}`);
  }
  lines.push("");

  lines.push("SKILLS:");
  for (const s of profile.skills) {
    lines.push(`[skill:${s.id}] ${s.name}${s.category ? ` (${s.category})` : ""}`);
  }

  return lines.join("\n");
}
