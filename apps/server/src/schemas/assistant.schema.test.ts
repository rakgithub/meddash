import { describe, expect, it } from "vitest";
import {
  assistantCompareBodySchema,
  assistantMessageBodySchema,
  compareEventSchema,
  messagePartSchema,
} from "./assistant.schema.js";

const valid = {
  caseFile: { symptoms: ["Sore throat"], duration: "2-3 days", forWhom: "me", avoid: [] },
  history: [
    { role: "user", text: "Sore throat" },
    { role: "assistant", text: "How long?", productIds: ["1"] },
  ],
  userText: "  2-3 days  ",
};

describe("assistantMessageBodySchema", () => {
  it("accepts a valid turn and trims the user text", () => {
    const result = assistantMessageBodySchema.parse(valid);
    expect(result.userText).toBe("2-3 days");
  });

  it("accepts an assistant reply with no text (cards or an alert only)", () => {
    const history = [{ role: "assistant", text: "", productIds: [] }];
    expect(assistantMessageBodySchema.safeParse({ ...valid, history }).success).toBe(true);
  });

  it("cuts long context instead of rejecting it", () => {
    const result = assistantMessageBodySchema.parse({
      ...valid,
      caseFile: {
        symptoms: [...Array(25).fill("s"), "x".repeat(100)],
        duration: "d".repeat(50),
        forWhom: null,
        avoid: ["  ", "Tablets"],
      },
      history: [
        { role: "user", text: "u".repeat(1500) },
        { role: "assistant", text: "a".repeat(5000), productIds: [] },
      ],
    });
    expect(result.caseFile.symptoms).toHaveLength(20);
    expect(result.caseFile.duration).toHaveLength(40);
    expect(result.caseFile.avoid).toEqual(["Tablets"]);
    expect(result.history.map((m) => m.text.length)).toEqual([1000, 2000]);
  });

  it.each([
    ["empty user text", { userText: "   " }],
    ["user text over 1,000 characters", { userText: "a".repeat(1001) }],
    ["more than 20 history messages", { history: Array(21).fill(valid.history[0]) }],
    ["an unknown role", { history: [{ role: "system", text: "hi" }] }],
    ["a bad product id", { history: [{ role: "assistant", text: "", productIds: ["abc"] }] }],
    ["an unknown forWhom", { caseFile: { ...valid.caseFile, forWhom: "dog" } }],
    ["an extra case file field", { caseFile: { ...valid.caseFile, notes: "x" } }],
    ["an extra top-level field", { model: "claude-opus-5-5" }],
    ["a missing case file", { caseFile: undefined }],
  ])("rejects %s", (_name, change) => {
    expect(assistantMessageBodySchema.safeParse({ ...valid, ...change }).success).toBe(false);
  });
});

describe("messagePartSchema", () => {
  it("accepts each part kind", () => {
    for (const part of [
      { kind: "text", text: "Hi" },
      { kind: "thinking", steps: [{ label: "Checking", done: true }] },
      { kind: "symptoms", symptoms: ["Fever"] },
      { kind: "quickReplies", question: "How long?", field: "duration", options: [] },
      { kind: "products", items: [] },
      { kind: "alert", level: "urgent", title: "t", body: "b" },
    ]) {
      expect(messagePartSchema.safeParse(part).success).toBe(true);
    }
  });

  it("rejects an unknown kind", () => {
    expect(messagePartSchema.safeParse({ kind: "html", html: "<b>" }).success).toBe(false);
  });
});

describe("assistantCompareBodySchema", () => {
  it("trims the question", () => {
    expect(
      assistantCompareBodySchema.parse({ productIds: ["1", "2"], question: "  Cheapest? " }),
    ).toEqual({ productIds: ["1", "2"], question: "Cheapest?" });
  });
});

describe("compareEventSchema", () => {
  it("accepts text, a table row and an alert", () => {
    for (const event of [
      { kind: "text", text: "Hi" },
      { kind: "row", row: "unitPrice" },
      { kind: "alert", level: "urgent", title: "t", body: "b" },
    ]) {
      expect(compareEventSchema.safeParse(event).success).toBe(true);
    }
  });

  it("rejects a row that is not in the table", () => {
    expect(compareEventSchema.safeParse({ kind: "row", row: "colour" }).success).toBe(false);
  });
});
