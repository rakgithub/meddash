import { describe, expect, it } from "vitest";
import { assistantMessageBodySchema, messagePartSchema } from "./assistant.schema.js";

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

  it.each([
    ["empty user text", { userText: "   " }],
    ["user text over 1,000 characters", { userText: "a".repeat(1001) }],
    ["more than 20 history messages", { history: Array(21).fill(valid.history[0]) }],
    ["a long user message in history", { history: [{ role: "user", text: "a".repeat(1001) }] }],
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
