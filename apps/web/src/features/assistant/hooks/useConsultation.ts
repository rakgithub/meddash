import { useEffect, useReducer, useRef } from "react";
import { AssistantError, streamEngine } from "../api/streamEngine";
import type { CaseField, CaseFile, Message, QuickReply } from "../types";
import { applyAnswer } from "../utils/caseFile";
import { consultationReducer, isPaused, messageText } from "../utils/consultationReducer";
import { loadConsultation, saveConsultation } from "../utils/consultationStorage";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Holds the whole conversation and runs the assistant engine for each turn. `onSessionEnded` is called
 * with the message the server refused when it no longer accepts the session (401), so the app can send
 * the user to log in and send it again afterwards.
 * The conversation starts from, and is mirrored to, `sessionStorage`, so a reload keeps it.
 */
export function useConsultation({
  onSessionEnded,
}: { onSessionEnded?: (userText: string) => void } = {}) {
  const [state, dispatch] = useReducer(consultationReducer, undefined, loadConsultation);
  const controllerRef = useRef<AbortController | null>(null);

  // Unmounting (closing the app, not changing page: the provider sits above the routes) cancels a reply.
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => saveConsultation(state), [state]);

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
      for await (const part of streamEngine({ caseFile, history, userText, signal })) {
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
      const error = status === "error" && err instanceof AssistantError ? err.message : undefined;
      dispatch({ type: "finish", id: assistantId, status, error });
      if (err instanceof AssistantError && err.status === 401) onSessionEnded?.(userText);
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  const { messages, caseFile } = state;
  const isStreaming = messages.at(-1)?.status === "streaming";
  const paused = isPaused(messages);

  /** Sends a user message, optionally with a changed case file (a quick reply) that the engine sees at once. */
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

  function stop() {
    controllerRef.current?.abort();
  }

  function startOver() {
    controllerRef.current?.abort();
    dispatch({ type: "reset" });
  }

  /** Asks again for the last user message; the conversation before it is kept. */
  function retry() {
    const lastUserIndex = messages.findLastIndex((m) => m.role === "user");
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
    stop,
    retry,
    startOver,
  };
}
