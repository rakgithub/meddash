import { ApiError, apiPostStream } from "../../../lib/apiClient";
import type { AssistantEngine, HistoryMessage, Message, MessagePart } from "../types";
import { regionFromMessage } from "../utils/bodyRegions";
import { messageText } from "../utils/consultationReducer";
import { redFlagAlert } from "../utils/redFlags";

/** The server's limits (apps/server/src/schemas/assistant.schema.ts); a longer history is rejected. */
const MAX_HISTORY_MESSAGES = 20;
const MAX_PRODUCT_IDS = 10;

export const RATE_LIMIT_MESSAGE =
  "You’ve sent a lot of messages in a short time. Please try again in a few minutes.";
export const SESSION_ENDED_MESSAGE = "Your session has ended. Please log in again.";

/** A failure whose message is safe and useful to show in the chat; `status` when the API refused. */
export class AssistantError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "AssistantError";
  }
}

function friendlyMessage(err: ApiError): string {
  if (err.status === 429) return RATE_LIMIT_MESSAGE;
  if (err.status === 401) return SESSION_ENDED_MESSAGE;
  return err.message;
}

/** What the server needs of the conversation so far: who said what, and which products were shown. */
export function condenseHistory(messages: Message[]): HistoryMessage[] {
  return messages.slice(-MAX_HISTORY_MESSAGES).map((message) => {
    if (message.role === "user") return { role: "user", text: messageText(message) };
    // A reply can be only a question with tap-to-answer options; the model needs to see what it asked.
    const question = message.parts.flatMap((p) => (p.kind === "quickReplies" ? [p.question] : []));
    const text = [messageText(message), ...question].filter(Boolean).join("\n");
    // A later products part replaces an earlier one, so the last one holds what was shown.
    const productIds =
      message.parts
        .flatMap((p) => (p.kind === "products" ? [p.items.map((i) => i.product.id)] : []))
        .at(-1) ?? [];
    return { role: "assistant", text, productIds: productIds.slice(0, MAX_PRODUCT_IDS) };
  });
}

export interface SseEvent {
  event: string;
  data: string;
}

/** Splits complete events off the front of `buffer`; `rest` is an event still being received. */
export function parseSseEvents(buffer: string): { events: SseEvent[]; rest: string } {
  // A chunk can end between the \r and \n of a CRLF; keep that \r back so it isn't read as a line end.
  const heldCr = buffer.endsWith("\r") ? "\r" : "";
  const blocks = buffer
    .slice(0, buffer.length - heldCr.length)
    .replace(/\r\n?/g, "\n")
    .split("\n\n");
  const rest = (blocks.pop() ?? "") + heldCr;
  const events = blocks.flatMap((block) => {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    return data.length > 0 ? [{ event, data: data.join("\n") }] : [];
  });
  return { events, rest };
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Checks the fields the UI reads, so an unexpected event can't break rendering. */
export function isMessagePart(value: unknown): value is MessagePart {
  if (!isObject(value)) return false;
  switch (value.kind) {
    case "text":
      return typeof value.text === "string";
    case "thinking":
      return Array.isArray(value.steps);
    case "symptoms":
      return Array.isArray(value.symptoms);
    case "quickReplies":
      return (
        typeof value.question === "string" &&
        typeof value.field === "string" &&
        Array.isArray(value.options)
      );
    case "products":
      return Array.isArray(value.items);
    case "alert":
      return (
        (value.level === "urgent" || value.level === "caution") &&
        typeof value.title === "string" &&
        typeof value.body === "string"
      );
    default:
      return false;
  }
}

/** A malformed event is skipped like an unknown one, instead of failing the whole reply. */
function parseJson(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    console.warn("Skipped an assistant event that is not JSON");
    return undefined;
  }
}

function errorMessage(data: string): string {
  try {
    const body: unknown = JSON.parse(data);
    if (isObject(body) && typeof body.message === "string") return body.message;
  } catch {
    // Not JSON: fall through to the generic message.
  }
  return "The assistant could not answer. Please try again.";
}

/** Yields the `data` events of an SSE body that pass `isEvent`, until `event: done`. */
export async function* readEvents<T>(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  isEvent: (value: unknown) => value is T,
): AsyncGenerator<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  // Leaving the loop early (Stop, or the consumer breaks) cancels the response body.
  const cancel = () => void reader.cancel().catch(() => {});
  signal.addEventListener("abort", cancel);
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const { events, rest } = parseSseEvents(buffer + decoder.decode(value, { stream: true }));
      buffer = rest;
      for (const { event, data } of events) {
        if (event === "done") return;
        if (event === "error") throw new AssistantError(errorMessage(data));
        const parsed = parseJson(data);
        if (isEvent(parsed)) yield parsed;
      }
    }
    signal.throwIfAborted();
    // The server always ends with `done`; without it the reply was cut off.
    throw new AssistantError("The reply was cut off. Please try again.");
  } finally {
    signal.removeEventListener("abort", cancel);
    cancel();
  }
}

/** POSTs JSON to an assistant endpoint and returns the SSE body, or throws an `AssistantError`. */
export async function postAssistant(
  path: string,
  body: unknown,
  signal: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  try {
    return await apiPostStream(path, body, { credentials: "include", signal });
  } catch (err) {
    signal.throwIfAborted();
    if (!(err instanceof ApiError)) throw err;
    throw new AssistantError(friendlyMessage(err), err.status);
  }
}

/** The real assistant: posts the turn to the API and yields the parts it streams back as SSE. */
export const streamEngine: AssistantEngine = async function* ({
  caseFile,
  history,
  userText,
  signal,
}) {
  // A second check behind the server's: an urgent symptom never needs a round trip.
  const alert = redFlagAlert(userText);
  if (alert) {
    yield alert;
    return;
  }
  // An area chip has a fixed answer: its common symptoms to pick from. No model call needed.
  const region = regionFromMessage(userText);
  if (region) {
    yield { kind: "text", text: "Thanks. Pick what fits best; you can add more afterwards." };
    yield {
      kind: "quickReplies",
      question: `What’s going on with your ${region.label.toLowerCase()}?`,
      field: "symptoms",
      options: region.symptoms.map((symptom) => ({ label: symptom, value: symptom })),
    };
    return;
  }

  const body = await postAssistant(
    "/assistant/messages",
    { caseFile, history: condenseHistory(history), userText },
    signal,
  );
  yield* readEvents(body, signal, isMessagePart);
};
