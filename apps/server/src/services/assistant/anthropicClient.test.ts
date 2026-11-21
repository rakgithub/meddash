import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { anthropicClient, createAnthropicClient } from "./anthropicClient.js";

describe("createAnthropicClient", () => {
  it.each([undefined, ""])("returns null when the key is %j", (key) => {
    expect(createAnthropicClient(key)).toBeNull();
  });

  it("creates a client with the given key", () => {
    const client = createAnthropicClient("sk-test");
    expect(client).toBeInstanceOf(Anthropic);
    expect(client?.apiKey).toBe("sk-test");
  });

  it("is null in tests, which never set a key", () => {
    expect(anthropicClient).toBeNull();
  });
});
