import { describe, expect, it } from "vitest";
import { coughSyrupDetail, ibuprofenDetail } from "../../../test/fixtures";
import type { Message, MessagePart } from "../types";
import {
  consultationReducer,
  initialConsultation,
  isPaused,
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

  it("replaces an earlier thinking snapshot in place when other parts came between", () => {
    const parts: MessagePart[] = [
      { kind: "thinking", steps: [{ label: "Checking", done: true }] },
      { kind: "symptoms", symptoms: ["Fever"] },
      { kind: "thinking", steps: [{ label: "Searching", done: true }] },
    ];
    const state = parts.reduce(
      (s, part) => consultationReducer(s, { type: "part", id: "a1", part }),
      sent,
    );

    expect(reply(state).parts).toEqual([
      { kind: "thinking", steps: [{ label: "Searching", done: true }] },
      { kind: "symptoms", symptoms: ["Fever"] },
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

  it("stores the case file sent with the message", () => {
    const state = consultationReducer(initialConsultation, {
      type: "send",
      userId: "u1",
      assistantId: "a1",
      text: "A child",
      caseFile: { ...initialConsultation.caseFile, forWhom: "child" },
    });

    expect(state.caseFile.forWhom).toBe("child");
    expect(state.messages[0].parts).toEqual([{ kind: "text", text: "A child" }]);
  });

  describe("safety rules", () => {
    const urgent: MessagePart = {
      kind: "alert",
      level: "urgent",
      title: "This needs a doctor now",
      body: "Call 112.",
    };
    const part = (state: ConsultationState, p: MessagePart, id = "a1") =>
      consultationReducer(state, { type: "part", id, part: p });

    it("never shows a prescription-only product as the best fit, whatever the engine sent", () => {
      const state = part(sent, {
        kind: "products",
        items: [
          { product: coughSyrupDetail, reason: "", fit: "best" },
          { product: ibuprofenDetail, reason: "", fit: "good" },
        ],
      });

      const [products] = reply(state).parts;
      expect(products.kind === "products" && products.items.map((i) => i.fit)).toEqual([
        "good",
        "locked",
      ]);
    });

    it("adds cautions for who the products are for", () => {
      const forChild = { ...sent, caseFile: { ...sent.caseFile, forWhom: "child" as const } };
      const spray = {
        ...ibuprofenDetail,
        warnings: "Not suitable for children under 6 years.",
      };

      const state = part(forChild, {
        kind: "products",
        items: [{ product: spray, reason: "", fit: "best" }],
      });

      expect(reply(state).parts[0]).toMatchObject({
        items: [{ fit: "good", caution: "Not suitable for children under 6 years." }],
      });
    });

    it("pauses after an urgent alert: no products, no questions and no new turns", () => {
      let state = part(sent, urgent);
      state = part(state, { kind: "products", items: [] });
      state = part(state, {
        kind: "quickReplies",
        question: "Who is it for?",
        field: "forWhom",
        options: [],
      });
      state = consultationReducer(state, { type: "finish", id: "a1", status: "done" });

      expect(isPaused(state.messages)).toBe(true);
      expect(reply(state).parts).toEqual([urgent]);
      expect(
        consultationReducer(state, { type: "send", userId: "u2", assistantId: "a2", text: "Hi" }),
      ).toBe(state);
    });

    it("isn't paused by a caution alert", () => {
      const state = part(sent, { ...urgent, level: "caution" });

      expect(isPaused(state.messages)).toBe(false);
    });

    it("starts over with an empty conversation", () => {
      const state = consultationReducer(part(sent, urgent), { type: "reset" });

      expect(state).toEqual(initialConsultation);
    });
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
