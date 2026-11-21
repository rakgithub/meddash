import Anthropic from "@anthropic-ai/sdk";
import { config } from "../../config/env.js";

/**
 * Returns null without a key so the server still starts; the assistant endpoint
 * turns that into a 503 instead of failing every request at the SDK.
 */
export function createAnthropicClient(apiKey: string | undefined): Anthropic | null {
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export const anthropicClient = createAnthropicClient(config.anthropicApiKey);
