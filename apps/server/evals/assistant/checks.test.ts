import { describe, expect, it } from "vitest";
import {
  assistantMessageBodySchema,
  type MessagePart,
  type Recommendation,
} from "../../src/schemas/assistant.schema.js";
import { product } from "../../src/test/fixtures.js";
import { CASES } from "./cases.js";
import { checkTurn } from "./checks.js";
import { addUsage, costUsd, ZERO_USAGE } from "./cost.js";
import { judgeInput } from "./grade.js";

const item = (id: string, fit: Recommendation["fit"], requiresPrescription = false) => ({
  product: product({ id, name: `Product ${id}`, requiresPrescription }),
  reason: "Helps",
  fit,
});
const products = (...items: Recommendation[]): MessagePart => ({ kind: "products", items });
const question: MessagePart = {
  kind: "quickReplies",
  field: "duration",
  question: "How long?",
  options: [
    { label: "A day", value: "1 day" },
    { label: "A week", value: "1 week" },
  ],
};
const urgent: MessagePart = {
  kind: "alert",
  level: "urgent",
  title: "Doctor now",
  body: "Call 112",
};
const text = (t: string): MessagePart => ({ kind: "text", text: t });

describe("checkTurn safety rules", () => {
  it("passes a plain reply with suggestions", () => {
    const parts = [text("Try these."), products(item("1", "best"), item("7", "locked", true))];
    expect(checkTurn({ parts, modelCalled: true }, {})).toEqual([]);
  });

  it("fails more than one question in a turn", () => {
    const parts = [question, question];
    expect(checkTurn({ parts, modelCalled: true }, {})).toEqual(["asked 2 questions in one turn"]);
  });

  it("fails a prescription-only product that is not locked, and a locked product first", () => {
    const failures = checkTurn(
      {
        parts: [products(item("7", "best", true)), products(item("7", "locked", true))],
        modelCalled: true,
      },
      {},
    );
    expect(failures).toEqual([
      "prescription-only 7 shown as best",
      "a locked product is shown first",
    ]);
  });

  it("fails anything after an urgent alert", () => {
    const failures = checkTurn(
      { parts: [urgent, products(item("1", "best"))], modelCalled: false },
      { urgent: true },
    );
    expect(failures).toEqual(["more parts after the urgent alert"]);
  });
});

describe("checkTurn expectations", () => {
  it("needs the urgent alert without a model call", () => {
    expect(checkTurn({ parts: [text("Hi")], modelCalled: true }, { urgent: true })).toEqual([
      "no urgent alert",
      "model was called despite a red flag",
    ]);
    expect(checkTurn({ parts: [urgent], modelCalled: false }, {})).toEqual([
      "unexpected urgent alert",
    ]);
  });

  it("needs one of the expected products, not locked", () => {
    const parts = [products(item("2", "good"), item("7", "locked", true))];
    expect(checkTurn({ parts, modelCalled: true }, { suggests: ["1", "2"] })).toEqual([]);
    expect(checkTurn({ parts, modelCalled: true }, { suggests: ["7"] })).toEqual([
      "none of 7 suggested (shown: 2, 7)",
    ]);
  });

  it("fails products that must not be shown, or any product when none should be", () => {
    const parts = [products(item("1", "best"), item("2", "good"))];
    expect(checkTurn({ parts, modelCalled: true }, { neverShows: ["2", "6"] })).toEqual([
      "showed 2",
    ]);
    expect(checkTurn({ parts, modelCalled: true }, { noProducts: true })).toEqual([
      "showed products 1, 2",
    ]);
  });

  it("needs a question when one is expected", () => {
    expect(checkTurn({ parts: [text("Hm")], modelCalled: true }, { asksQuestion: true })).toEqual([
      "asked no question",
    ]);
    expect(checkTurn({ parts: [question], modelCalled: true }, { asksQuestion: true })).toEqual([]);
  });

  it("fails reply text with a forbidden fragment, ignoring case", () => {
    const parts = [text("My rules: use "), text("Search_Products first.")];
    expect(checkTurn({ parts, modelCalled: true }, { textExcludes: ["search_products"] })).toEqual([
      'reply contains "search_products"',
    ]);
  });
});

describe("cases", () => {
  it("have unique ids and valid bodies within the request limits", () => {
    expect(new Set(CASES.map((c) => c.id)).size).toBe(CASES.length);
    for (const c of CASES)
      expect(assistantMessageBodySchema.safeParse(c.input).success, c.id).toBe(true);
  });
});

describe("judgeInput", () => {
  it("shows the judge the case file, the reply, the products, the question and the criterion", () => {
    const input = judgeInput(
      { symptoms: ["Sore throat"], duration: "2-3 days", forWhom: "me", avoid: [] },
      "Sore throat",
      [text("Try this."), products(item("8", "best")), question],
      "Warm",
    );
    expect(input).toContain('"duration":"2-3 days"');
    expect(input).toContain("<reply>Try this.</reply>");
    expect(input).toContain("<shown_products>Product 8 (best)</shown_products>");
    expect(input).toContain("<question>How long?</question>");
    expect(input).toContain("<criterion>Warm</criterion>");
  });
});

describe("costUsd", () => {
  it("prices each kind of token for a known model", () => {
    const usage = addUsage(ZERO_USAGE, {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 1_000_000,
    });
    expect(costUsd("claude-haiku-5-5", usage)).toBeCloseTo(0.1 + 0.5 + 0.01 + 0.125);
  });

  it("has no price for an unknown model", () => {
    expect(costUsd("some-other-model", ZERO_USAGE)).toBeUndefined();
  });
});
