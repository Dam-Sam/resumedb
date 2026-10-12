import type { SupabaseClient } from "@supabase/supabase-js";
import { getLLM } from "@/lib/llm";
import { withRunLog } from "@/lib/llm/log";
import { parseMessage } from "./messages";
import type { Prompt } from "./prompts";
import { ParsedResume } from "./schemas";

// Resume text → structured profile data, logged to llm_runs.
// The caller loads the live prompt first, so a missing prompt isn't mistaken for an unreadable resume.
export async function parseResume(supabase: SupabaseClient, userId: string, active: Prompt, resumeText: string) {
  const prompt = parseMessage(resumeText);
  const result = await withRunLog(
    supabase,
    userId,
    { purpose: "parse", promptId: active.id, promptVersion: active.label, input: active.system + prompt },
    () => getLLM().generateObject({ system: active.system, prompt, schema: ParsedResume }),
  );
  return result.data;
}
