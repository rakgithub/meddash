/**
 * The message protocol between the chat UI and the assistant engine. The UI renders only these typed
 * parts, never free-form HTML. Later phases add more part kinds (symptoms, quick replies, products, alerts).
 */
export type Role = "user" | "assistant";

export interface ThinkingStep {
  label: string;
  done: boolean;
}

/**
 * While streaming, consecutive `text` parts are deltas appended to the previous text, and a `thinking`
 * part following another `thinking` part is a newer snapshot that replaces it.
 */
export type MessagePart =
  { kind: "text"; text: string } | { kind: "thinking"; steps: ThinkingStep[] };

/** `stopped` = the user pressed Stop; `error` = the engine threw. */
export type MessageStatus = "streaming" | "done" | "stopped" | "error";

export interface Message {
  id: string;
  role: Role;
  parts: MessagePart[];
  status: MessageStatus;
}

/** The single seam between the UI and the AI. */
export type AssistantEngine = (input: {
  history: Message[];
  userText: string;
  signal: AbortSignal;
}) => AsyncIterable<MessagePart>;
