import type { SupabaseClient } from "@supabase/supabase-js";
import { getLLM } from "@/lib/llm";
import { withRunLog } from "@/lib/llm/log";
import { PARSE_PROMPT_VERSION, PARSE_SYSTEM, parsePrompt } from "./prompts";
import { ParsedResume } from "./schemas";

// Resume text → structured profile data, logged to llm_runs.
export async function parseResume(supabase: SupabaseClient, userId: string, resumeText: string) {
  const prompt = parsePrompt(resumeText);
  const result = await withRunLog(
    supabase,
    userId,
    { purpose: "parse", promptVersion: PARSE_PROMPT_VERSION, input: PARSE_SYSTEM + prompt },
    () => getLLM().generateObject({ system: PARSE_SYSTEM, prompt, schema: ParsedResume }),
  );
  return result.data;
}
