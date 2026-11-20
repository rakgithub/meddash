import type { CaseField, CaseFile, Message, MessagePart, MessageStatus } from "../types";
import { applyAnswer, emptyCaseFile, mergeSymptoms } from "./caseFile";

export interface ConsultationState {
  messages: Message[];
  caseFile: CaseFile;
}

export type ConsultationAction =
  /** `answer` is set when the text is a tapped quick reply; it is stored in the case file. */
  | {
      type: "send";
      userId: string;
      assistantId: string;
      text: string;
      answer?: { field: CaseField; value: string };
    }
  | { type: "part"; id: string; part: MessagePart }
  | { type: "finish"; id: string; status: Exclude<MessageStatus, "streaming"> }
  /** Replaces the last assistant message (the failed one) with a fresh streaming one. */
  | { type: "retry"; assistantId: string }
  /** The user edited the symptom chips. */
  | { type: "setSymptoms"; symptoms: string[] };

export const initialConsultation: ConsultationState = { messages: [], caseFile: emptyCaseFile };

function assistantMessage(id: string): Message {
  return { id, role: "assistant", parts: [], status: "streaming" };
}

function addPart(parts: MessagePart[], part: MessagePart): MessagePart[] {
  const last = parts.at(-1);
  if (last?.kind === "text" && part.kind === "text") {
    return [...parts.slice(0, -1), { kind: "text", text: last.text + part.text }];
  }
  const isSnapshot = part.kind === "thinking" || part.kind === "products";
  if (isSnapshot && last?.kind === part.kind) {
    return [...parts.slice(0, -1), part];
  }
  return [...parts, part];
}

function updateMessage(
  state: ConsultationState,
  id: string,
  update: (message: Message) => Message,
): ConsultationState {
  return { ...state, messages: state.messages.map((m) => (m.id === id ? update(m) : m)) };
}

function isStreaming(state: ConsultationState, id: string) {
  return state.messages.some((m) => m.id === id && m.status === "streaming");
}

export function consultationReducer(
  state: ConsultationState,
  action: ConsultationAction,
): ConsultationState {
  switch (action.type) {
    case "send": {
      const { answer } = action;
      return {
        caseFile: answer ? applyAnswer(state.caseFile, answer.field, answer.value) : state.caseFile,
        messages: [
          ...state.messages,
          {
            id: action.userId,
            role: "user",
            parts: [{ kind: "text", text: action.text }],
            status: "done",
          },
          assistantMessage(action.assistantId),
        ],
      };
    }
    case "part": {
      // A late part after Stop or an error must not reopen the message or change the case file.
      if (!isStreaming(state, action.id)) return state;
      const { part } = action;
      const next = updateMessage(state, action.id, (m) => ({
        ...m,
        parts: addPart(m.parts, part),
      }));
      if (part.kind !== "symptoms") return next;
      return {
        ...next,
        caseFile: {
          ...next.caseFile,
          symptoms: mergeSymptoms(next.caseFile.symptoms, part.symptoms),
        },
      };
    }
    case "finish":
      return updateMessage(state, action.id, (m) =>
        m.status === "streaming" ? { ...m, status: action.status } : m,
      );
    case "retry": {
      const last = state.messages.at(-1);
      if (last?.role !== "assistant") return state;
      return {
        ...state,
        messages: [...state.messages.slice(0, -1), assistantMessage(action.assistantId)],
      };
    }
    case "setSymptoms":
      return {
        ...state,
        caseFile: { ...state.caseFile, symptoms: mergeSymptoms([], action.symptoms) },
      };
  }
}

/** The plain text of a message, e.g. to resend a user message or announce a reply. */
export function messageText(message: Message): string {
  return message.parts
    .flatMap((part) => (part.kind === "text" ? [part.text] : []))
    .join("")
    .trim();
}
