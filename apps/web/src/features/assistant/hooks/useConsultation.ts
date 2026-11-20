import { useEffect, useReducer, useRef } from "react";
import { mockEngine } from "../api/mockEngine";
import type { CaseField, CaseFile, Message, QuickReply } from "../types";
import { applyAnswer } from "../utils/caseFile";
import {
  consultationReducer,
  initialConsultation,
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

  function start(text: string, answer?: { field: CaseField; value: string }) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    const assistantId = crypto.randomUUID();
    dispatch({ type: "send", userId: crypto.randomUUID(), assistantId, text: trimmed, answer });
    // The reducer applies the same answer; the engine needs it now, before the next render.
    const nextCaseFile = answer ? applyAnswer(caseFile, answer.field, answer.value) : caseFile;
    void run(assistantId, messages, trimmed, nextCaseFile);
  }

  function send(text: string) {
    start(text);
  }

  /** A tapped quick reply: echoed as the user's message and stored in the case file. */
  function answer(field: CaseField, option: QuickReply) {
    start(option.label, { field, value: option.value });
  }

  function setSymptoms(symptoms: string[]) {
    dispatch({ type: "setSymptoms", symptoms });
  }

  function stop() {
    controllerRef.current?.abort();
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

  return { messages, caseFile, isStreaming, send, answer, setSymptoms, stop, retry };
}
