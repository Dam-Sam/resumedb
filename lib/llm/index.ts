import { ClaudeProvider } from "./claude";
import type { LLMProvider } from "./types";

// Picks the model provider from LLM_PROVIDER. Claude is the only one for now.
export function getLLM(): LLMProvider {
  const name = process.env.LLM_PROVIDER || "claude";
  switch (name) {
    case "claude":
      return new ClaudeProvider();
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${name}`);
  }
}

export * from "./types";
