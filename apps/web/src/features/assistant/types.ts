import type { ProductDetail } from "../products";

/**
 * The message protocol between the chat UI and the assistant engine. The UI renders only these typed
 * parts, never free-form HTML.
 */
export type Role = "user" | "assistant";

export interface ThinkingStep {
  label: string;
  done: boolean;
}

export const FOR_WHOM = ["me", "child", "pregnant", "senior"] as const;
export type ForWhom = (typeof FOR_WHOM)[number];

export interface CaseFile {
  symptoms: string[];
  duration: string | null;
  forWhom: ForWhom | null;
  /** What the user wants to steer away from, e.g. "Tablets". Set by "Not for me" and the case file panel. */
  avoid: string[];
}

/** The case-file fields a quick reply can answer. */
export type CaseField = "symptoms" | "duration" | "forWhom";

export interface QuickReply {
  /** Shown on the button and echoed as the user's message. */
  label: string;
  /** Stored in the case file. */
  value: string;
}

export interface Recommendation {
  product: ProductDetail;
  /** The "Why this?" line. */
  reason: string;
  /** `locked` = prescription-only: shown greyed out, never as the top suggestion. */
  fit: "best" | "good" | "locked";
  /** The product warning that applies to who it is for, e.g. pregnancy. Set by `rankRecommendations`. */
  caution?: string;
}

/**
 * While streaming, consecutive `text` parts are deltas appended to the previous text. A `thinking` part
 * after another `thinking` part, or a `products` part after another `products` part, is a newer snapshot
 * that replaces it.
 */
export type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "thinking"; steps: ThinkingStep[] }
  | { kind: "symptoms"; symptoms: string[] }
  | { kind: "quickReplies"; question: string; field: CaseField; options: QuickReply[] }
  | {
      kind: "products";
      items: Recommendation[];
      /** Cards still loading, shown as skeletons. */
      loading?: number;
      /** Suggestions that could not be loaded and were left out. */
      unavailable?: number;
      /** Suggestions left out because the user ruled them out. Set by the reducer. */
      ruledOut?: number;
    }
  /** `urgent` = this needs a doctor now; the conversation stops recommending until it starts over. */
  | { kind: "alert"; level: "urgent" | "caution"; title: string; body: string };

/** `stopped` = the user pressed Stop; `error` = the engine threw. */
export type MessageStatus = "streaming" | "done" | "stopped" | "error";

export interface Message {
  id: string;
  role: Role;
  parts: MessagePart[];
  status: MessageStatus;
  /** Why the reply failed, when there is something useful to say, e.g. the rate limit. */
  error?: string;
}

/** The single seam between the UI and the AI. */
export type AssistantEngine = (input: {
  caseFile: CaseFile;
  history: Message[];
  userText: string;
  signal: AbortSignal;
}) => AsyncIterable<MessagePart>;
