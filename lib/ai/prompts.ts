import type { SupabaseClient } from "@supabase/supabase-js";

// System prompts live in the `prompts` table (see 0004_prompts.sql), so they can
// change without a redeploy. Each AI call reads the live version right before
// it runs; if there isn't one, the call fails rather than guessing.

export interface Prompt {
  id: string;
  name: string;
  version: number;
  system: string;
  // "tailor-v2": stored on each llm_runs row next to prompt_id.
  label: string;
}

export async function getActivePrompt(supabase: SupabaseClient, name: "parse" | "tailor"): Promise<Prompt> {
  const { data, error } = await supabase
    .from("prompts")
    .select("id, name, version, system")
    .eq("name", name)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the ${name} prompt: ${error.message}`);
  if (!data) throw new Error(`No active ${name} prompt. Run select activate_prompt('${name}', <version>).`);
  return { ...data, label: `${data.name}-v${data.version}` };
}
