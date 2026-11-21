import { describe, expect, it, vi } from "vitest";
import type { CompareEvent } from "../../schemas/assistant.schema.js";
import { fakeModel, type ScriptedReply } from "../../test/fakeModel.js";
import { product } from "../../test/fixtures.js";
import {
  buildCompareMessages,
  COMPARE_MAX_TOKENS,
  compareItem,
  HIGHLIGHT_ROW_TOOL,
  runCompare,
  stockText,
  unitPriceText,
} from "./compare.js";
import { logCompareToStdout, REFUSAL_REPLY, type TurnLog } from "./runTurn.js";

const ibuprofen = product({
  id: "1",
  name: "Ibuprofen 400mg",
  price: 6.5,
  packSize: "20 tablets",
  warnings: "Do not use with stomach ulcers.",
});
const paracetamol = product({
  id: "2",
  name: "Paracetamol 500mg",
  price: 3,
  packSize: "20 tablets",
});
const products = [ibuprofen, paracetamol];

function setup(replies: ScriptedReply[]) {
  const model = fakeModel(replies);
  const logs: TurnLog[] = [];
  const deps = {
    stream: model.stream,
    model: "claude-haiku-5-5",
    signal: new AbortController().signal,
    logCompare: (log: TurnLog) => logs.push(log),
  };
  return { model, logs, deps };
}

async function collect(events: AsyncIterable<CompareEvent>) {
  const out: CompareEvent[] = [];
  for await (const event of events) out.push(event);
  return out;
}

const ask = (question: string, replies: ScriptedReply[]) => {
  const s = setup(replies);
  return { ...s, events: collect(runCompare({ question }, products, s.deps)) };
};

describe("unitPriceText", () => {
  it.each([
    [{ price: 6.5, packSize: "20 tablets" }, "€0.325 per tablet"],
    [{ price: 5, packSize: "100 ml" }, "€0.05 per ml"],
    [{ price: 3, packSize: "2,5 g" }, "€1.20 per g"],
    [{ price: 3, packSize: "Tube" }, null],
    [{ price: 3, packSize: "0 tablets" }, null],
    [{ price: 3, packSize: null }, null],
  ])("reads %j as %j", (p, expected) => {
    expect(unitPriceText(p)).toBe(expected);
  });
});

describe("stockText", () => {
  it.each([
    [0, "Out of stock"],
    [5, "Only 5 left"],
    [6, "In stock"],
  ])("%i is %s", (quantity, text) => {
    expect(stockText(quantity)).toBe(text);
  });
});

describe("buildCompareMessages", () => {
  it("sends the products as data, then the question", () => {
    const [message] = buildCompareMessages("Which is cheapest?", products);
    expect(message.role).toBe("user");
    expect(message.content).toEqual([
      {
        type: "text",
        text: `<products>${JSON.stringify(products.map(compareItem))}</products>`,
      },
      { type: "text", text: "Which is cheapest?" },
    ]);
    expect(compareItem(ibuprofen)).toMatchObject({
      price: "€6.50",
      unitPrice: "€0.325 per tablet",
      stock: "In stock",
      requiresPrescription: false,
    });
  });
});

describe("runCompare", () => {
  it("streams the answer and the row the model pointed at", async () => {
    const { events, model, logs } = ask("Which is gentler on the stomach?", [
      {
        text: ["Paracetamol 500mg", " is gentler."],
        tools: [{ name: "highlight_row", input: { row: "warnings" } }],
      },
    ]);

    expect(await events).toEqual([
      { kind: "text", text: "Paracetamol 500mg" },
      { kind: "text", text: " is gentler." },
      { kind: "row", row: "warnings" },
    ]);
    expect(model.requests).toHaveLength(1);
    expect(model.requests[0]).toMatchObject({
      model: "claude-haiku-5-5",
      max_tokens: COMPARE_MAX_TOKENS,
      output_config: { effort: "low" },
      tools: [HIGHLIGHT_ROW_TOOL],
    });
    expect(model.requests[0]).not.toHaveProperty("tool_choice");
    expect(logs).toEqual([
      expect.objectContaining({ model: "claude-haiku-5-5", toolRounds: 0, stopReason: "tool_use" }),
    ]);
  });

  it("answers without a row when the answer is about no single row", async () => {
    const { events } = ask("Hello?", [{ text: ["I can compare these products."] }]);
    expect(await events).toEqual([{ kind: "text", text: "I can compare these products." }]);
  });

  it("asks once more, with tools off, when the model points at a row before answering", async () => {
    const { events, model, logs } = ask("Which is cheapest?", [
      { tools: [{ name: "highlight_row", input: { row: "unitPrice" } }] },
      { text: ["Paracetamol 500mg is cheapest."] },
    ]);

    expect(await events).toEqual([
      { kind: "row", row: "unitPrice" },
      { kind: "text", text: "Paracetamol 500mg is cheapest." },
    ]);
    expect(model.requests[1].tool_choice).toEqual({ type: "none" });
    expect(model.requests[1].messages.at(-1)).toEqual({
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: "toolu_0_0", content: "Highlighted.", is_error: false },
      ],
    });
    expect(logs[0]).toMatchObject({ toolRounds: 1, inputTokens: 200 });
  });

  it("sends no row for an invalid one and tells the model so", async () => {
    const { events, model } = ask("Which is best?", [
      { tools: [{ name: "highlight_row", input: { row: "colour" } }] },
      { text: ["Ask a pharmacist."] },
    ]);

    expect(await events).toEqual([{ kind: "text", text: "Ask a pharmacist." }]);
    expect(model.requests[1].messages.at(-1)).toMatchObject({
      content: [{ content: "Not a table row.", is_error: true }],
    });
  });

  it("sends one row even if the model points twice", async () => {
    const { events } = ask("Which is cheapest?", [
      {
        text: ["Paracetamol."],
        tools: [
          { name: "highlight_row", input: { row: "price" } },
          { name: "highlight_row", input: { row: "stock" } },
        ],
      },
    ]);
    expect((await events).filter((e) => e.kind === "row")).toEqual([{ kind: "row", row: "price" }]);
  });

  it("gives the fixed text on a refusal", async () => {
    const { events } = ask("Something odd", [{ stopReason: "refusal" }]);
    expect(await events).toEqual([{ kind: "text", text: REFUSAL_REPLY }]);
  });

  it("answers an urgent red flag with the alert alone and no model call", async () => {
    const { events, model, logs } = ask("Which is best for my crushing chest pain?", []);
    expect(await events).toEqual([expect.objectContaining({ kind: "alert", level: "urgent" })]);
    expect(model.requests).toHaveLength(0);
    expect(logs).toHaveLength(0);
  });

  it("passes the abort signal to the model and logs even when the stream fails", async () => {
    const abort = new AbortController();
    const logs: TurnLog[] = [];
    const stream = vi.fn(() => {
      throw new Error("aborted");
    });
    const events = collect(
      runCompare({ question: "Which is cheapest?" }, products, {
        stream,
        model: "m",
        signal: abort.signal,
        logCompare: (log) => logs.push(log),
      }),
    );

    await expect(events).rejects.toThrow("aborted");
    expect(stream).toHaveBeenCalledWith(expect.anything(), abort.signal);
    expect(logs).toHaveLength(1);
  });
});

describe("logCompareToStdout", () => {
  it("writes one JSON line under its own event name", () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const log: TurnLog = {
      model: "m",
      inputTokens: 1,
      outputTokens: 2,
      cacheReadTokens: 3,
      cacheWriteTokens: 4,
      toolRounds: 0,
      durationMs: 5,
      stopReason: "end_turn",
    };
    logCompareToStdout(log);
    expect(write).toHaveBeenCalledWith(
      `${JSON.stringify({ event: "assistant_compare", ...log })}\n`,
    );
    write.mockRestore();
  });
});
