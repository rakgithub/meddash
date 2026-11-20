import type { Message, MessagePart, MessageStatus } from "../types";

export interface ConsultationState {
  messages: Message[];
}

export type ConsultationAction =
  | { type: "send"; userId: string; assistantId: string; text: string }
  | { type: "part"; id: string; part: MessagePart }
  | { type: "finish"; id: string; status: Exclude<MessageStatus, "streaming"> }
  /** Replaces the last assistant message (the failed one) with a fresh streaming one. */
  | { type: "retry"; assistantId: string };

export const initialConsultation: ConsultationState = { messages: [] };

function assistantMessage(id: string): Message {
  return { id, role: "assistant", parts: [], status: "streaming" };
}

function addPart(parts: MessagePart[], part: MessagePart): MessagePart[] {
  const last = parts.at(-1);
  if (last?.kind === "text" && part.kind === "text") {
    return [...parts.slice(0, -1), { kind: "text", text: last.text + part.text }];
  }
  if (last?.kind === "thinking" && part.kind === "thinking") {
    return [...parts.slice(0, -1), part];
  }
  return [...parts, part];
}

function updateMessage(
  state: ConsultationState,
  id: string,
  update: (message: Message) => Message,
): ConsultationState {
  return { messages: state.messages.map((m) => (m.id === id ? update(m) : m)) };
}

export function consultationReducer(
  state: ConsultationState,
  action: ConsultationAction,
): ConsultationState {
  switch (action.type) {
    case "send":
      return {
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
    case "part":
      return updateMessage(state, action.id, (m) =>
        // A late part after Stop or an error must not reopen the message.
        m.status === "streaming" ? { ...m, parts: addPart(m.parts, action.part) } : m,
      );
    case "finish":
      return updateMessage(state, action.id, (m) =>
        m.status === "streaming" ? { ...m, status: action.status } : m,
      );
    case "retry": {
      const last = state.messages.at(-1);
      if (last?.role !== "assistant") return state;
      return { messages: [...state.messages.slice(0, -1), assistantMessage(action.assistantId)] };
    }
  }
}

/** The plain text of a message, e.g. to resend a user message or announce a reply. */
export function messageText(message: Message): string {
  return message.parts
    .flatMap((part) => (part.kind === "text" ? [part.text] : []))
    .join("")
    .trim();
}
