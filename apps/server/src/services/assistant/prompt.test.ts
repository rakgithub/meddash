import { describe, expect, it } from "vitest";
import { emptyCaseFile } from "../../test/fixtures.js";
import { buildMessages, SYSTEM, SYSTEM_PROMPT } from "./prompt.js";

describe("SYSTEM", () => {
  it("is one cached block", () => {
    expect(SYSTEM).toEqual([
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ]);
  });
});

describe("buildMessages", () => {
  it("puts the case file in front of the user text as data", () => {
    const caseFile = { ...emptyCaseFile, symptoms: ["Sore throat"] };
    expect(buildMessages({ caseFile, history: [], userText: "It hurts" })).toEqual([
      {
        role: "user",
        content: [
          { type: "text", text: `<case_file>${JSON.stringify(caseFile)}</case_file>` },
          { type: "text", text: "It hurts" },
        ],
      },
    ]);
  });

  it("maps the history, noting suggested ids and skipping what the API can't take", () => {
    const messages = buildMessages({
      caseFile: emptyCaseFile,
      history: [
        { role: "assistant", text: "Hi, how can I help?", productIds: [] },
        { role: "user", text: "Sore throat" },
        { role: "assistant", text: "Try these.", productIds: ["1", "8"] },
        { role: "user", text: "chest pain" },
        { role: "assistant", text: "", productIds: [] },
        { role: "assistant", text: "", productIds: ["2"] },
      ],
      userText: "Thanks",
    });
    expect(messages.slice(0, -1)).toEqual([
      { role: "user", content: "Sore throat" },
      { role: "assistant", content: "Try these.\n[Suggested product ids: 1, 8]" },
      { role: "user", content: "chest pain" },
      { role: "assistant", content: "[Suggested product ids: 2]" },
    ]);
  });
});
