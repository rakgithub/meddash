import { describe, expect, it } from "vitest";
import type { AssistantMessageBody, MessagePart } from "../../schemas/assistant.schema.js";
import { PLACEHOLDER_REPLY, runTurn } from "./runTurn.js";

const input = (userText: string): AssistantMessageBody => ({
  caseFile: { symptoms: [], duration: null, forWhom: null, avoid: [] },
  history: [],
  userText,
});

async function collect(parts: AsyncIterable<MessagePart>) {
  const out: MessagePart[] = [];
  for await (const part of parts) out.push(part);
  return out;
}

describe("runTurn", () => {
  it("ends an urgent turn with the alert alone", async () => {
    const parts = await collect(runTurn(input("crushing chest pain")));
    expect(parts).toEqual([expect.objectContaining({ kind: "alert", level: "urgent" })]);
  });

  it("answers everything else with the placeholder after the safety check", async () => {
    expect(await collect(runTurn(input("Sore throat")))).toEqual([
      { kind: "thinking", steps: [{ label: "Checking for warning signs", done: true }] },
      { kind: "text", text: PLACEHOLDER_REPLY },
    ]);
  });
});
