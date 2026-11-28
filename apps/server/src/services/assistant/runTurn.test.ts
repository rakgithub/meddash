import { describe, expect, it, vi } from "vitest";
import type { AssistantMessageBody, MessagePart } from "../../schemas/assistant.schema.js";
import { fakeModel, type ScriptedReply } from "../../test/fakeModel.js";
import { catalogueItem, emptyCaseFile, product } from "../../test/fixtures.js";
import {
  logTurnToStdout,
  MAX_TOKENS,
  MAX_TOOL_ROUNDS,
  REFUSAL_REPLY,
  runTurn,
  type TurnLog,
} from "./runTurn.js";
import { SYSTEM } from "./prompt.js";
import { FIXED_OPTIONS, TOOLS } from "./tools.js";

const lozenge = product({ id: "1", name: "Throat Lozenges" });
const rx = product({ id: "3", name: "Antibiotic", requiresPrescription: true });
const catalogue = [lozenge, rx];

const input = (userText: string, overrides: Partial<AssistantMessageBody> = {}) => ({
  caseFile: emptyCaseFile,
  history: [],
  userText,
  ...overrides,
});

function setup(replies: ScriptedReply[]) {
  const model = fakeModel(replies);
  const logs: TurnLog[] = [];
  const searchCatalogue = vi.fn(async () => catalogue.map(catalogueItem));
  const deps = {
    stream: model.stream,
    model: "claude-haiku-5-5",
    signal: new AbortController().signal,
    searchCatalogue,
    findProductById: async (id: number) => catalogue.find((p) => p.id === String(id)) ?? null,
    logTurn: (log: TurnLog) => logs.push(log),
  };
  return { model, logs, deps, searchCatalogue };
}

async function collect(parts: AsyncIterable<MessagePart>) {
  const out: MessagePart[] = [];
  for await (const part of parts) out.push(part);
  return out;
}

const warningStep = { label: "Checking for warning signs", done: true };

describe("runTurn", () => {
  describe("red flags", () => {
    it("ends an urgent turn with the alert alone and no model call", async () => {
      const { model, deps, logs } = setup([]);
      const parts = await collect(runTurn(input("crushing chest pain"), deps));
      expect(parts).toEqual([expect.objectContaining({ kind: "alert", level: "urgent" })]);
      expect(model.requests).toHaveLength(0);
      expect(logs).toHaveLength(0);
    });

    it("repeats the alert once an earlier user message raised a red flag", async () => {
      const { deps } = setup([]);
      const parts = await collect(
        runTurn(
          input("ok, anything for a cough?", {
            history: [
              { role: "user", text: "I have chest pain" },
              { role: "assistant", text: "", productIds: [] },
            ],
          }),
          deps,
        ),
      );
      expect(parts).toEqual([expect.objectContaining({ kind: "alert", level: "urgent" })]);
    });
  });

  it("streams text deltas as text parts after the safety check", async () => {
    const { deps, model, logs } = setup([{ text: ["Sorry to ", "hear that."] }]);
    expect(await collect(runTurn(input("Sore throat"), deps))).toEqual([
      { kind: "thinking", steps: [warningStep] },
      { kind: "text", text: "Sorry to " },
      { kind: "text", text: "hear that." },
    ]);
    expect(model.requests[0]).toMatchObject({
      model: "claude-haiku-5-5",
      max_tokens: MAX_TOKENS,
      output_config: { effort: "low" },
      cache_control: { type: "ephemeral" },
      system: SYSTEM,
      tools: TOOLS,
    });
    expect(model.requests[0]).not.toHaveProperty("tool_choice");
    expect(model.signals[0]).toBe(deps.signal);
    expect(logs).toEqual([
      expect.objectContaining({
        model: "claude-haiku-5-5",
        inputTokens: 100,
        outputTokens: 20,
        cacheReadTokens: 80,
        toolRounds: 0,
        stopReason: "end_turn",
      }),
    ]);
  });

  it("searches, recommends real products and answers, returning parallel results in one message", async () => {
    const { deps, model, searchCatalogue } = setup([
      {
        text: ["Let me look."],
        tools: [
          { name: "note_symptoms", input: { symptoms: ["Sore throat"] } },
          { name: "search_products", input: { query: "sore throat", category: null } },
        ],
      },
      {
        tools: [
          {
            name: "recommend_products",
            input: {
              items: [
                { id: "3", reason: "Infection", fit: "best" },
                { id: "1", reason: "Soothes the throat", fit: "good" },
                { id: "77", reason: "Invented", fit: "good" },
              ],
            },
          },
        ],
      },
      { text: ["These should help."] },
    ]);

    const parts = await collect(runTurn(input("Sore throat"), deps));

    expect(searchCatalogue).toHaveBeenCalledWith("sore throat", { category: undefined, limit: 8 });
    expect(parts).toEqual([
      { kind: "thinking", steps: [warningStep] },
      { kind: "text", text: "Let me look." },
      {
        kind: "thinking",
        steps: [warningStep, { label: "Searching the catalogue", done: false }],
      },
      { kind: "thinking", steps: [warningStep, { label: "Searching the catalogue", done: true }] },
      { kind: "symptoms", symptoms: ["Sore throat"] },
      {
        kind: "products",
        items: [
          { product: lozenge, reason: "Soothes the throat", fit: "good" },
          { product: rx, reason: "Infection", fit: "locked" },
        ],
      },
      { kind: "text", text: "These should help." },
    ]);

    const second = model.requests[1].messages;
    expect(second.at(-1)).toEqual({
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: "toolu_0_0", content: "Noted.", is_error: false },
        {
          type: "tool_result",
          tool_use_id: "toolu_0_1",
          content: JSON.stringify(catalogue.map(catalogueItem)),
          is_error: false,
        },
      ],
    });
    const third = model.requests[2].messages.at(-1);
    expect(third).toMatchObject({
      content: [
        {
          content: "Shown: 1, 3. Not from a search this turn, left out: 77.",
          is_error: false,
        },
      ],
    });
  });

  it("drops every id when the model recommends without searching", async () => {
    const { deps } = setup([
      {
        tools: [
          { name: "recommend_products", input: { items: [{ id: "1", reason: "r", fit: "best" }] } },
        ],
      },
      { text: ["Let me search first."] },
    ]);
    const parts = await collect(runTurn(input("Sore throat"), deps));
    expect(parts.some((p) => p.kind === "products")).toBe(false);
  });

  it("shows a question as quick replies and ends the turn without another model call", async () => {
    const question = {
      field: "duration",
      question: "How long has it been?",
      options: [
        { label: "Today", value: "Today" },
        { label: "A few days", value: "2-3 days" },
      ],
    };
    const { deps, model } = setup([
      { text: ["One question."], tools: [{ name: "ask_question", input: question }] },
    ]);
    const parts = await collect(runTurn(input("Sore throat"), deps));
    // The model's duration options are replaced with the fixed ones the case file can hold.
    expect(parts.at(-1)).toEqual({
      kind: "quickReplies",
      field: "duration",
      question: "How long has it been?",
      options: FIXED_OPTIONS.duration,
    });
    expect(model.requests).toHaveLength(1);
  });

  it("keeps the model's own options for a symptoms question", async () => {
    const question = {
      field: "symptoms",
      question: "Anything else?",
      options: [
        { label: "Cough", value: "Cough" },
        { label: "Fever", value: "Fever" },
      ],
    };
    const { deps } = setup([{ tools: [{ name: "ask_question", input: question }] }]);
    const parts = await collect(runTurn(input("Sore throat"), deps));
    expect(parts.at(-1)).toEqual({ kind: "quickReplies", ...question });
  });

  it("returns an invalid tool input to the model as an error instead of running it", async () => {
    const { deps, model } = setup([
      {
        tools: [
          {
            name: "ask_question",
            input: {
              field: "forWhom",
              question: "Who is it for?",
              // One option is too few.
              options: [{ label: "Me", value: "me" }],
            },
          },
          { name: "made_up_tool", input: {} },
        ],
      },
      { text: ["Sorry."] },
    ]);
    const parts = await collect(runTurn(input("Sore throat"), deps));
    expect(parts.some((p) => p.kind === "quickReplies")).toBe(false);
    expect(model.requests[1].messages.at(-1)).toMatchObject({
      content: [
        { is_error: true, content: expect.stringMatching(/at least 2/i) },
        { is_error: true, content: "Unknown tool: made_up_tool" },
      ],
    });
  });

  it(`stops tool use after ${MAX_TOOL_ROUNDS} rounds and asks for an answer without tools`, async () => {
    const search = { name: "search_products", input: { query: "throat", category: null } };
    const { deps, model, logs } = setup([
      ...Array<ScriptedReply>(MAX_TOOL_ROUNDS).fill({ tools: [search] }),
      { text: ["Here is what I found."], tools: [search] },
    ]);
    const parts = await collect(runTurn(input("Sore throat"), deps));
    expect(model.requests).toHaveLength(MAX_TOOL_ROUNDS + 1);
    expect(model.requests.at(-1)).toMatchObject({ tool_choice: { type: "none" } });
    expect(parts.at(-1)).toEqual({ kind: "text", text: "Here is what I found." });
    expect(logs[0]).toMatchObject({ toolRounds: MAX_TOOL_ROUNDS, inputTokens: 500 });
  });

  it("answers a refusal with the fixed pharmacist text", async () => {
    const { deps } = setup([{ stopReason: "refusal" }]);
    const parts = await collect(runTurn(input("Sore throat"), deps));
    expect(parts.at(-1)).toEqual({ kind: "text", text: REFUSAL_REPLY });
  });

  it("never runs a tool call cut off by max_tokens", async () => {
    const { deps, model, searchCatalogue } = setup([
      {
        text: ["Let me"],
        tools: [{ name: "search_products", input: { query: "thr", category: null } }],
        stopReason: "max_tokens",
      },
    ]);
    await collect(runTurn(input("Sore throat"), deps));
    expect(searchCatalogue).not.toHaveBeenCalled();
    expect(model.requests).toHaveLength(1);
  });

  it("logs the turn even when the model call fails", async () => {
    const { deps, logs } = setup([]);
    await expect(collect(runTurn(input("Sore throat"), deps))).rejects.toThrow(/No scripted reply/);
    expect(logs).toHaveLength(1);
  });
});

describe("logTurnToStdout", () => {
  it("writes one JSON line with numbers only", () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const log: TurnLog = {
      model: "m",
      inputTokens: 1,
      outputTokens: 2,
      cacheReadTokens: 3,
      cacheWriteTokens: 4,
      toolRounds: 1,
      durationMs: 5,
      stopReason: "end_turn",
    };
    logTurnToStdout(log);
    expect(write).toHaveBeenCalledWith(`${JSON.stringify({ event: "assistant_turn", ...log })}\n`);
    write.mockRestore();
  });
});
