import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LLMError, type LLMResult } from "./types";

interface RunInfo {
  purpose: "parse" | "tailor";
  promptVersion: string;
  // The exact text sent to the model; stored as a hash so runs on the same input can be matched up.
  input: string;
}

// Runs one LLM call and writes a row to llm_runs, whether it succeeds or fails.
export async function withRunLog<T>(
  supabase: SupabaseClient,
  userId: string,
  run: RunInfo,
  call: () => Promise<LLMResult<T>>,
): Promise<LLMResult<T>> {
  const started = Date.now();
  const base = {
    user_id: userId,
    purpose: run.purpose,
    prompt_version: run.promptVersion,
    profile_hash: createHash("sha256").update(run.input).digest("hex"),
  };

  try {
    const result = await call();
    await insertRun(supabase, {
      ...base,
      model: result.model,
      status: "succeeded",
      raw_response: result.raw,
      parsed_response: result.data,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      latency_ms: Date.now() - started,
    });
    return result;
  } catch (err) {
    const d = err instanceof LLMError ? err.details : {};
    await insertRun(supabase, {
      ...base,
      model: d.model ?? process.env.LLM_MODEL ?? "unknown",
      status: "failed",
      raw_response: d.raw,
      error: err instanceof Error ? err.message : String(err),
      input_tokens: d.inputTokens,
      output_tokens: d.outputTokens,
      latency_ms: Date.now() - started,
    });
    throw err;
  }
}

async function insertRun(supabase: SupabaseClient, row: Record<string, unknown>) {
  // Logging must never break the request it's logging.
  const { error } = await supabase.from("llm_runs").insert(row);
  if (error) console.error("llm_runs insert failed:", error.message);
}
