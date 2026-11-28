import { describe, expect, it } from "vitest";
import type { Message } from "../types";
import { emptyCaseFile } from "./caseFile";
import { initialConsultation } from "./consultationReducer";
import { clearConsultation, loadConsultation, saveConsultation } from "./consultationStorage";

const KEY = "meddash-consultation";

const user: Message = {
  id: "1",
  role: "user",
  parts: [{ kind: "text", text: "Headache" }],
  status: "done",
};
const caseFile = { ...emptyCaseFile, symptoms: ["Headache"], forWhom: "me" as const };
const fromChat = { "1": "a1" };

describe("consultationStorage", () => {
  it("starts fresh when nothing is stored", () => {
    expect(loadConsultation()).toBe(initialConsultation);
  });

  it("restores what it saved", () => {
    saveConsultation({ messages: [user], caseFile, fromChat });

    expect(loadConsultation()).toEqual({ messages: [user], caseFile, fromChat });
  });

  it("marks a reply that a reload cut off as stopped", () => {
    const streaming: Message = { id: "2", role: "assistant", parts: [], status: "streaming" };
    saveConsultation({ messages: [user, streaming], caseFile, fromChat });

    expect(loadConsultation().messages[1].status).toBe("stopped");
  });

  it("stores nothing for an empty conversation, and clears", () => {
    saveConsultation({ messages: [user], caseFile, fromChat });
    saveConsultation(initialConsultation);
    expect(sessionStorage.getItem(KEY)).toBeNull();

    saveConsultation({ messages: [user], caseFile, fromChat });
    clearConsultation();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it.each([
    ["not JSON", "{"],
    ["another version", JSON.stringify({ version: 1, state: { messages: [user], caseFile } })],
    ["no state", JSON.stringify({ version: 2 })],
    [
      "a message with an unknown part",
      JSON.stringify({
        version: 2,
        state: {
          messages: [{ ...user, parts: [{ kind: "html", html: "<b>" }] }],
          caseFile,
          fromChat,
        },
      }),
    ],
    [
      "a message with an unknown role",
      JSON.stringify({
        version: 2,
        state: { messages: [{ ...user, role: "system" }], caseFile, fromChat },
      }),
    ],
    [
      "a case file with an unknown patient",
      JSON.stringify({
        version: 2,
        state: { messages: [user], caseFile: { ...caseFile, forWhom: "dog" }, fromChat },
      }),
    ],
    [
      "products from the chat that aren't a map of ids",
      JSON.stringify({ version: 2, state: { messages: [user], caseFile, fromChat: ["1"] } }),
    ],
    [
      "no products from the chat (the version 1 shape)",
      JSON.stringify({ version: 2, state: { messages: [user], caseFile } }),
    ],
  ])("drops a stored copy with %s instead of trusting it", (_, raw) => {
    sessionStorage.setItem(KEY, raw);

    expect(loadConsultation()).toBe(initialConsultation);
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });
});
