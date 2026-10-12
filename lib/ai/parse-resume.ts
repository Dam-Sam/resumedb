import type { SupabaseClient } from "@supabase/supabase-js";
import { getLLM } from "@/lib/llm";
import { withRunLog } from "@/lib/llm/log";
import * as parsePrompt from "./prompts/parse";
import { ParsedResume } from "./schemas";

// Resume text → structured profile data, logged to llm_runs.
export async function parseResume(supabase: SupabaseClient, userId: string, resumeText: string) {
  const prompt = parsePrompt.userMessage(resumeText);
  const result = await withRunLog(
    supabase,
    userId,
    { purpose: "parse", promptVersion: parsePrompt.VERSION, input: parsePrompt.SYSTEM + prompt },
    () => getLLM().generateObject({ system: parsePrompt.SYSTEM, prompt, schema: ParsedResume }),
  );
  return result.data;
}
