import type { CompareEvent } from "../types";
import { COMPARE_ROW_KEYS, type CompareRowKey } from "../utils/compareProducts";
import { redFlagAlert } from "../utils/redFlags";
import { isMessagePart, postAssistant, readEvents } from "./streamEngine";

const isRow = (value: unknown): value is CompareRowKey =>
  COMPARE_ROW_KEYS.some((key) => key === value);

export function isCompareEvent(value: unknown): value is CompareEvent {
  if (typeof value !== "object" || value === null || !("kind" in value)) return false;
  if (value.kind === "row") return "row" in value && isRow(value.row);
  // Text and alerts have the same shape as in the chat.
  return (value.kind === "text" || value.kind === "alert") && isMessagePart(value);
}

/** Asks the assistant about the compared products; yields the answer's text and the row it is about. */
export async function* askCompare(
  productIds: string[],
  question: string,
  signal: AbortSignal,
): AsyncGenerator<CompareEvent> {
  // A second check behind the server's, as in the chat: an urgent symptom never needs a round trip.
  const alert = redFlagAlert(question);
  if (alert) {
    yield alert;
    return;
  }
  const body = await postAssistant("/assistant/compare", { productIds, question }, signal);
  yield* readEvents(body, signal, isCompareEvent);
}
