// Loads each case's posting text: desktop jd.md files, or rows in the DB.
// Nothing posting-specific is stored in the repo, only paths and row ids.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export async function loadPostings(manifest, admin) {
  const out = [];
  for (const c of manifest.cases) {
    let text;
    if (c.src === "file") {
      text = readFileSync(join(manifest.desktop_root, c.path), "utf8");
    } else {
      const { data, error } = await admin.from(c.table).select("job_description").eq("id", c.row_id).single();
      if (error) throw new Error(`${c.id}: ${error.message}`);
      text = data.job_description;
    }
    if (!text || text.length < 200) throw new Error(`${c.id}: posting text missing or too short`);
    out.push({ ...c, jobDescription: text });
  }
  return out;
}
