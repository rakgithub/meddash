import { describe, expect, it } from "vitest";
import type { Message } from "../types";
import {
  consultationReducer,
  initialConsultation,
  messageText,
  type ConsultationState,
} from "./consultationReducer";

const sent = consultationReducer(initialConsultation, {
  type: "send",
  userId: "u1",
  assistantId: "a1",
  text: "Hay fever",
});

const reply = (state: ConsultationState) => state.messages[state.messages.length - 1];

describe("consultationReducer", () => {
  it("adds the user message and an empty streaming reply on send", () => {
    expect(sent.messages).toEqual([
      { id: "u1", role: "user", parts: [{ kind: "text", text: "Hay fever" }], status: "done" },
      { id: "a1", role: "assistant", parts: [], status: "streaming" },
    ]);
  });

  it("joins consecutive text deltas into one part", () => {
    let state = consultationReducer(sent, {
      type: "part",
      id: "a1",
      part: { kind: "text", text: "Hello " },
    });
    state = consultationReducer(state, {
      type: "part",
      id: "a1",
      part: { kind: "text", text: "there" },
    });

    expect(reply(state).parts).toEqual([{ kind: "text", text: "Hello there" }]);
  });

  it("replaces a thinking snapshot with the next one, then starts a text part after it", () => {
    let state = consultationReducer(sent, {
      type: "part",
      id: "a1",
      part: { kind: "thinking", steps: [{ label: "Checking", done: false }] },
    });
    state = consultationReducer(state, {
      type: "part",
      id: "a1",
      part: { kind: "thinking", steps: [{ label: "Checking", done: true }] },
    });
    state = consultationReducer(state, {
      type: "part",
      id: "a1",
      part: { kind: "text", text: "Hi" },
    });

    expect(reply(state).parts).toEqual([
      { kind: "thinking", steps: [{ label: "Checking", done: true }] },
      { kind: "text", text: "Hi" },
    ]);
  });

  it("ignores parts that arrive after the reply finished", () => {
    const stopped = consultationReducer(sent, { type: "finish", id: "a1", status: "stopped" });
    const late = consultationReducer(stopped, {
      type: "part",
      id: "a1",
      part: { kind: "text", text: "late" },
    });

    expect(reply(late)).toEqual({ id: "a1", role: "assistant", parts: [], status: "stopped" });
  });

  it("doesn't change a finished reply's status again", () => {
    const failed = consultationReducer(sent, { type: "finish", id: "a1", status: "error" });

    expect(
      reply(consultationReducer(failed, { type: "finish", id: "a1", status: "done" })).status,
    ).toBe("error");
  });

  it("swaps the failed reply for a fresh one on retry and keeps the conversation", () => {
    const failed = consultationReducer(sent, { type: "finish", id: "a1", status: "error" });
    const retried = consultationReducer(failed, { type: "retry", assistantId: "a2" });

    expect(retried.messages).toHaveLength(2);
    expect(retried.messages[0].id).toBe("u1");
    expect(reply(retried)).toEqual({ id: "a2", role: "assistant", parts: [], status: "streaming" });
  });

  it("does nothing on retry when the last message isn't the assistant's", () => {
    expect(consultationReducer(initialConsultation, { type: "retry", assistantId: "a2" })).toBe(
      initialConsultation,
    );
  });
});

describe("consultationReducer case file", () => {
  it("adds the symptoms the assistant found to the case file", () => {
    let state = consultationReducer(sent, {
      type: "part",
      id: "a1",
      part: { kind: "symptoms", symptoms: ["Sore throat", "Fever"] },
    });
    state = consultationReducer(state, {
      type: "part",
      id: "a1",
      part: { kind: "symptoms", symptoms: ["fever", "Cough"] },
    });

    expect(state.caseFile.symptoms).toEqual(["Sore throat", "Fever", "Cough"]);
  });

  it("ignores symptoms that arrive after the reply finished", () => {
    const stopped = consultationReducer(sent, { type: "finish", id: "a1", status: "stopped" });
    const late = consultationReducer(stopped, {
      type: "part",
      id: "a1",
      part: { kind: "symptoms", symptoms: ["Fever"] },
    });

    expect(late).toBe(stopped);
  });

  it("replaces a products snapshot with the next one", () => {
    let state = consultationReducer(sent, {
      type: "part",
      id: "a1",
      part: { kind: "products", items: [], loading: 2 },
    });
    state = consultationReducer(state, {
      type: "part",
      id: "a1",
      part: { kind: "products", items: [], unavailable: 2 },
    });

    expect(reply(state).parts).toEqual([{ kind: "products", items: [], unavailable: 2 }]);
  });

  it("stores a quick-reply answer sent with the message", () => {
    const state = consultationReducer(initialConsultation, {
      type: "send",
      userId: "u1",
      assistantId: "a1",
      text: "A child",
      answer: { field: "forWhom", value: "child" },
    });

    expect(state.caseFile.forWhom).toBe("child");
    expect(state.messages[0].parts).toEqual([{ kind: "text", text: "A child" }]);
  });

  it("replaces the symptoms when the user edits the chips", () => {
    const state = consultationReducer(sent, {
      type: "setSymptoms",
      symptoms: ["Cough", " cough ", "Headache"],
    });

    expect(state.caseFile.symptoms).toEqual(["Cough", "Headache"]);
  });
});

describe("messageText", () => {
  it("joins the text parts and skips the thinking steps", () => {
    const message: Message = {
      id: "a1",
      role: "assistant",
      status: "done",
      parts: [
        { kind: "thinking", steps: [{ label: "Checking", done: true }] },
        { kind: "text", text: " Drink water. " },
      ],
    };

    expect(messageText(message)).toBe("Drink water.");
  });
});
