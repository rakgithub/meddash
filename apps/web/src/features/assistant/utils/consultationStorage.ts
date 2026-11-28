import { isMessagePart } from "../api/streamEngine";
import { FOR_WHOM, type CaseFile, type Message } from "../types";
import { initialConsultation, type ConsultationState } from "./consultationReducer";

/**
 * The live conversation is mirrored to `sessionStorage`, so going to another page or reloading the tab
 * keeps it. Bump `VERSION` when the stored shape changes: an older copy is then dropped, not misread.
 */
const STORAGE_KEY = "meddash-consultation";
const VERSION = 2;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

function isCaseFile(value: unknown): value is CaseFile {
  return (
    isObject(value) &&
    isStringArray(value.symptoms) &&
    isStringArray(value.avoid) &&
    (value.duration === null || typeof value.duration === "string") &&
    (value.forWhom === null || FOR_WHOM.some((option) => option === value.forWhom))
  );
}

function isFromChat(value: unknown): value is Record<string, string> {
  return (
    isObject(value) &&
    !Array.isArray(value) &&
    Object.values(value).every((id) => typeof id === "string")
  );
}

function isMessage(value: unknown): value is Message {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    (value.role === "user" || value.role === "assistant") &&
    (value.status === "streaming" ||
      value.status === "done" ||
      value.status === "stopped" ||
      value.status === "error") &&
    (value.error === undefined || typeof value.error === "string") &&
    Array.isArray(value.parts) &&
    value.parts.every(isMessagePart)
  );
}

/** The stored conversation, or a fresh one when there is none or it can't be trusted. */
export function loadConsultation(): ConsultationState {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked; the chat then simply starts fresh on each page load.
    return initialConsultation;
  }
  if (raw === null) return initialConsultation;

  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch {
    stored = undefined;
  }
  if (
    !isObject(stored) ||
    stored.version !== VERSION ||
    !isObject(stored.state) ||
    !Array.isArray(stored.state.messages) ||
    !stored.state.messages.every(isMessage) ||
    !isCaseFile(stored.state.caseFile) ||
    !isFromChat(stored.state.fromChat)
  ) {
    clearConsultation();
    return initialConsultation;
  }

  // A reload during a reply cut it off; nothing will finish it now.
  const messages = stored.state.messages.map((m) =>
    m.status === "streaming" ? { ...m, status: "stopped" as const } : m,
  );
  return { messages, caseFile: stored.state.caseFile, fromChat: stored.state.fromChat };
}

export function saveConsultation(state: ConsultationState) {
  try {
    if (state.messages.length === 0) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, state }));
  } catch {
    // Full or blocked storage only means a reload starts fresh; the chat itself keeps working.
  }
}

export function clearConsultation() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing was stored if storage is blocked.
  }
}
