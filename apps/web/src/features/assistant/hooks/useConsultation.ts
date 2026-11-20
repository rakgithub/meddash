import { useEffect, useReducer, useRef } from "react";
import { mockEngine } from "../api/mockEngine";
import type { ProductDetail } from "../../products";
import type { CaseField, CaseFile, Message, QuickReply } from "../types";
import { applyAnswer, avoidFor, type DismissReason } from "../utils/caseFile";
import {
  consultationReducer,
  initialConsultation,
  isPaused,
  messageText,
} from "../utils/consultationReducer";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Holds the whole conversation and runs the assistant engine for each turn. */
export function useConsultation() {
  const [state, dispatch] = useReducer(consultationReducer, initialConsultation);
  const controllerRef = useRef<AbortController | null>(null);

  // Leaving the page cancels a reply in progress.
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function run(
    assistantId: string,
    history: Message[],
    userText: string,
    caseFile: CaseFile,
  ) {
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;
    // With reduced motion the text appears at once instead of word by word.
    const buffer = prefersReducedMotion();
    let pending = "";
    const flush = () => {
      if (!pending) return;
      dispatch({ type: "part", id: assistantId, part: { kind: "text", text: pending } });
      pending = "";
    };

    try {
      for await (const part of mockEngine({ caseFile, history, userText, signal })) {
        if (signal.aborted) break;
        if (buffer && part.kind === "text") {
          pending += part.text;
          continue;
        }
        flush();
        dispatch({ type: "part", id: assistantId, part });
      }
      flush();
      dispatch({ type: "finish", id: assistantId, status: signal.aborted ? "stopped" : "done" });
    } catch (err) {
      flush();
      // An abort surfaces as a rejection from the engine; that is a stop, not a failure.
      const status = signal.aborted ? "stopped" : "error";
      if (status === "error") console.error("Assistant reply failed", err);
      dispatch({ type: "finish", id: assistantId, status });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  const { messages, caseFile } = state;
  const isStreaming = messages.at(-1)?.status === "streaming";
  const paused = isPaused(messages);

  /** Sends a user message, optionally together with a changed case file that the engine sees at once. */
  function start(text: string, nextCaseFile?: CaseFile) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || paused) return;
    const assistantId = crypto.randomUUID();
    dispatch({
      type: "send",
      userId: crypto.randomUUID(),
      assistantId,
      text: trimmed,
      caseFile: nextCaseFile,
    });
    void run(assistantId, messages, trimmed, nextCaseFile ?? caseFile);
  }

  function send(text: string) {
    start(text);
  }

  /** A tapped quick reply: echoed as the user's message and stored in the case file. */
  function answer(field: CaseField, option: QuickReply) {
    start(option.label, applyAnswer(caseFile, field, option.value));
  }

  /**
   * An edit in the case file panel. `text` describes it and is echoed as the user's message; it goes
   * through the engine like any message, so a symptom the user adds is screened for red flags too.
   */
  function refine(nextCaseFile: CaseFile, text: string) {
    start(text, nextCaseFile);
  }

  /** "Not for me": no new reply, the suggestions are re-ranked without the product. */
  function dismiss(product: ProductDetail, reason: DismissReason) {
    dispatch({ type: "dismiss", productId: product.id, avoid: avoidFor(reason, product) });
  }

  function stop() {
    controllerRef.current?.abort();
  }

  function startOver() {
    controllerRef.current?.abort();
    dispatch({ type: "reset" });
  }

  /** Asks again for the last user message; the conversation before it is kept. */
  function retry() {
    const lastUserIndex = messages.map((m) => m.role).lastIndexOf("user");
    if (lastUserIndex === -1 || isStreaming) return;
    const assistantId = crypto.randomUUID();
    dispatch({ type: "retry", assistantId });
    void run(
      assistantId,
      messages.slice(0, lastUserIndex),
      messageText(messages[lastUserIndex]),
      caseFile,
    );
  }

  return {
    messages,
    caseFile,
    isStreaming,
    paused,
    send,
    answer,
    refine,
    dismiss,
    stop,
    retry,
    startOver,
  };
}
