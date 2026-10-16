import type { z } from "zod";

export interface LLMResult<T> {
  data: T;
  raw: string;
  model: string;
  // Uncached input only; cached input is counted in the two fields below.
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

// The only way the app talks to a model. Swapping providers means one new file that implements this.
export interface LLMProvider {
  name: string;
  generateObject<T>(req: {
    system: string;
    prompt: string;
    schema: z.ZodType<T>;
    maxTokens?: number;
  }): Promise<LLMResult<T>>;
}

// A failed call that still carries whatever the model sent back, so it can be logged.
export class LLMError extends Error {
  constructor(
    message: string,
    readonly details: Partial<Omit<LLMResult<unknown>, "data">> = {},
  ) {
    super(message);
    this.name = "LLMError";
  }
}
