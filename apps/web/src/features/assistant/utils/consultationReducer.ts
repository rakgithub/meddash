import type { CaseFile, Message, MessagePart, MessageStatus } from "../types";
import { emptyCaseFile, mergeUnique } from "./caseFile";
import { rankRecommendations } from "./rankRecommendations";
import { ruleOut } from "./ruledOut";

export interface ConsultationState {
  messages: Message[];
  caseFile: CaseFile;
  /** Ids of products the user said are "Not for me". They never come back. */
  dismissed: string[];
}

type ProductsPart = Extract<MessagePart, { kind: "products" }>;

export type ConsultationAction =
  /** `caseFile` is set when the text comes with a case-file change: a quick reply or a panel edit. */
  | { type: "send"; userId: string; assistantId: string; text: string; caseFile?: CaseFile }
  | { type: "part"; id: string; part: MessagePart }
  | { type: "finish"; id: string; status: Exclude<MessageStatus, "streaming">; error?: string }
  /** Replaces the last assistant message (the failed one) with a fresh streaming one. */
  | { type: "retry"; assistantId: string }
  /** "Not for me": the product is dropped everywhere and `avoid` is added to the case file. */
  | { type: "dismiss"; productId: string; avoid: string }
  /** Clears the conversation, e.g. to start over after an urgent alert. */
  | { type: "reset" }
  /** Reopens a saved consultation in place of the current one. */
  | { type: "restore"; state: ConsultationState };

export const initialConsultation: ConsultationState = {
  messages: [],
  caseFile: emptyCaseFile,
  dismissed: [],
};

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

/** Drops what the user ruled out from a stack of suggestions and counts what was dropped. */
function applyRuledOut(part: ProductsPart, state: ConsultationState): ProductsPart {
  const items = ruleOut(part.items, state.dismissed, state.caseFile.avoid);
  const removed = part.items.length - items.length;
  if (removed === 0) return part;
  return { ...part, items, ruledOut: (part.ruledOut ?? 0) + removed };
}

function updateMessage(
  state: ConsultationState,
  id: string,
  update: (message: Message) => Message,
): ConsultationState {
  return { ...state, messages: state.messages.map((m) => (m.id === id ? update(m) : m)) };
}

/**
 * After an urgent alert the assistant stops recommending: no products, no questions and no new turns
 * until the user starts over. Enforced here, not only in the engine, so a real backend can't skip it.
 */
export function isPaused(messages: Message[]): boolean {
  return messages.some((m) => m.parts.some((p) => p.kind === "alert" && p.level === "urgent"));
}

const BLOCKED_WHEN_PAUSED = new Set<MessagePart["kind"]>(["products", "quickReplies"]);

function isStreaming(state: ConsultationState, id: string) {
  return state.messages.some((m) => m.id === id && m.status === "streaming");
}

export function consultationReducer(
  state: ConsultationState,
  action: ConsultationAction,
): ConsultationState {
  switch (action.type) {
    case "send": {
      if (isPaused(state.messages)) return state;
      return {
        ...state,
        caseFile: action.caseFile ?? state.caseFile,
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
      if (isPaused(state.messages) && BLOCKED_WHEN_PAUSED.has(action.part.kind)) return state;
      // The safety rules apply to every suggestion, whichever engine sent it.
      const part: MessagePart =
        action.part.kind === "products"
          ? applyRuledOut(
              {
                ...action.part,
                items: rankRecommendations(action.part.items, state.caseFile.forWhom),
              },
              state,
            )
          : action.part;
      const next = updateMessage(state, action.id, (m) => ({
        ...m,
        parts: addPart(m.parts, part),
      }));
      if (part.kind !== "symptoms") return next;
      return {
        ...next,
        caseFile: {
          ...next.caseFile,
          symptoms: mergeUnique(next.caseFile.symptoms, part.symptoms),
        },
      };
    }
    case "finish":
      return updateMessage(state, action.id, (m) =>
        m.status === "streaming"
          ? { ...m, status: action.status, ...(action.error ? { error: action.error } : {}) }
          : m,
      );
    case "retry": {
      const last = state.messages.at(-1);
      if (last?.role !== "assistant") return state;
      return {
        ...state,
        messages: [...state.messages.slice(0, -1), assistantMessage(action.assistantId)],
      };
    }
    case "dismiss": {
      const ruledOut: ConsultationState = {
        ...state,
        dismissed: [...new Set([...state.dismissed, action.productId])],
        caseFile: {
          ...state.caseFile,
          avoid: mergeUnique(state.caseFile.avoid, [action.avoid]),
        },
      };
      return {
        ...ruledOut,
        messages: ruledOut.messages.map((m) => ({
          ...m,
          parts: m.parts.map((p) => (p.kind === "products" ? applyRuledOut(p, ruledOut) : p)),
        })),
      };
    }
    case "reset":
      return initialConsultation;
    case "restore":
      // Nothing is streaming any more, so a reply saved mid-stream reads as stopped, not stuck.
      return {
        ...action.state,
        messages: action.state.messages.map((m) =>
          m.status === "streaming" ? { ...m, status: "stopped" } : m,
        ),
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
