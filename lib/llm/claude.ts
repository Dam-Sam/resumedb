import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { LLMError, type LLMProvider, type LLMResult } from "./types";

const DEFAULT_MODEL = "claude-sonnet-5-5";

export class ClaudeProvider implements LLMProvider {
  name = "claude";
  private client = new Anthropic();
  private model = process.env.LLM_MODEL || DEFAULT_MODEL;

  async generateObject<T>({
    system,
    prompt,
    schema,
    maxTokens = 16000,
  }: {
    system: string;
    prompt: string;
    schema: z.ZodType<T>;
    maxTokens?: number;
  }): Promise<LLMResult<T>> {
    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: maxTokens,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      // If a safety filter blocks a harmless request by mistake, Anthropic retries it on another model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // The system prompt is the same on every call for a purpose, so it's cached:
      // later calls within 5 minutes read it at a tenth of the input price.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");
    const details = {
      raw,
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? undefined,
      cacheWriteTokens: response.usage.cache_creation_input_tokens ?? undefined,
    };

    if (response.stop_reason === "refusal") {
      throw new LLMError(`Model refused: ${response.stop_details?.category ?? "unknown"}`, details);
    }
    if (response.stop_reason === "max_tokens") {
      throw new LLMError("Response was cut off (max_tokens)", details);
    }
    if (response.parsed_output == null) {
      throw new LLMError("Response didn't match the expected JSON shape", details);
    }

    return { data: response.parsed_output as T, ...details };
  }
}
