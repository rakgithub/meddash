import { describe, expect, it } from "vitest";
import type { MessagePart } from "../types";
import { createMockEngine } from "./mockEngine";

const engine = createMockEngine(0);

async function collect(userText: string, signal = new AbortController().signal) {
  const parts: MessagePart[] = [];
  for await (const part of engine({ history: [], userText, signal })) parts.push(part);
  return parts;
}

const textOf = (parts: MessagePart[]) =>
  parts.flatMap((p) => (p.kind === "text" ? [p.text] : [])).join("");

describe("mockEngine", () => {
  it("ticks the checks off one by one, then streams the reply word by word", async () => {
    const parts = await collect("Sore throat and fever");
    const thinking = parts.filter((p) => p.kind === "thinking");
    const text = parts.filter((p) => p.kind === "text");

    expect(thinking.map((p) => p.steps.filter((s) => s.done).length)).toEqual([0, 1, 2, 3, 4]);
    expect(thinking.at(-1)?.steps.map((s) => s.label)).toEqual([
      "Understanding symptoms",
      "Checking catalogue",
      "Filtering prescription-only",
      "3 matches",
    ]);
    expect(text.length).toBeGreaterThan(10);
    expect(textOf(parts)).toMatch(/^A sore throat with a temperature/);
  });

  it.each([
    ["Can't sleep", /Trouble sleeping/],
    ["Hay fever", /Hay fever responds/],
    ["Upset stomach", /upset stomach usually passes/],
  ])("answers %s with its own script", async (prompt, reply) => {
    expect(textOf(await collect(prompt))).toMatch(reply);
  });

  it("asks for more detail when it doesn't recognise the symptoms", async () => {
    expect(textOf(await collect("hmm"))).toMatch(/^Tell me a bit more/);
  });

  it("stops with the abort reason when the signal is aborted", async () => {
    const controller = new AbortController();
    const parts: MessagePart[] = [];
    const run = async () => {
      for await (const part of engine({
        history: [],
        userText: "Hay fever",
        signal: controller.signal,
      })) {
        parts.push(part);
        controller.abort();
      }
    };

    await expect(run()).rejects.toThrow();
    expect(parts).toHaveLength(1);
  });
});
