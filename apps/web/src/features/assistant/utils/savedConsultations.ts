import type { CaseFile, Message } from "../types";
import { DURATION_OPTIONS } from "./caseFile";
import type { ConsultationState } from "./consultationReducer";

/**
 * A consultation the signed-in user saved to reopen later. Kept in this browser only, per user, until
 * there is a backend endpoint for it.
 */
export interface SavedConsultation {
  /** The id of the conversation's first message, so saving the same consultation again replaces it. */
  id: string;
  /** ISO timestamp. */
  savedAt: string;
  /** e.g. "Sore throat, 2–3 days". */
  title: string;
  suggestions: number;
  state: ConsultationState;
}

/** Enough to find a recent one again without filling the browser's storage. */
export const MAX_SAVED = 10;

const storageKey = (userId: string) => `meddash-consultations-${userId}`;

/** How many products the latest suggestions offer, leaving out prescription-only ones. */
export function suggestionCount(messages: Message[]): number {
  const latest = messages.flatMap((m) => m.parts).findLast((p) => p.kind === "products");
  return latest ? latest.items.filter((item) => item.fit !== "locked").length : 0;
}

function titleFor({ symptoms, duration }: CaseFile): string {
  const durationLabel = DURATION_OPTIONS.find((o) => o.value === duration)?.label.toLowerCase();
  // Lower case reads as one phrase ("Sore throat, fever, 2–3 days"); the first letter is raised below.
  const title = [symptoms.join(", ").toLowerCase(), durationLabel].filter(Boolean).join(", ");
  if (!title) return "Consultation";
  return title[0].toUpperCase() + title.slice(1);
}

/** The entry to save, or null while there is nothing worth reopening: no suggestions yet. */
export function summarize(state: ConsultationState, now = new Date()): SavedConsultation | null {
  const id = state.messages[0]?.id;
  const suggestions = suggestionCount(state.messages);
  if (!id || suggestions === 0) return null;
  return { id, savedAt: now.toISOString(), title: titleFor(state.caseFile), suggestions, state };
}

/** "Sore throat, 2–3 days → 3 suggestions" */
export function summaryLine({ title, suggestions }: SavedConsultation): string {
  return `${title} → ${suggestions} ${suggestions === 1 ? "suggestion" : "suggestions"}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Storage is outside our control (edited by hand, an older version), so entries are checked on load. */
function isSavedConsultation(value: unknown): value is SavedConsultation {
  if (!isRecord(value) || !isRecord(value.state)) return false;
  const { state } = value;
  return (
    typeof value.id === "string" &&
    typeof value.savedAt === "string" &&
    typeof value.title === "string" &&
    typeof value.suggestions === "number" &&
    Array.isArray(state.messages) &&
    Array.isArray(state.dismissed) &&
    isRecord(state.caseFile) &&
    Array.isArray(state.caseFile.symptoms) &&
    Array.isArray(state.caseFile.avoid)
  );
}

/** Newest first. Unreadable storage counts as nothing saved, so the start screen still works. */
export function loadSaved(userId: string): SavedConsultation[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedConsultation) : [];
  } catch (err) {
    console.error("Could not read saved consultations", err);
    return [];
  }
}

function write(userId: string, items: SavedConsultation[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(items));
  return items;
}

/** Adds or replaces the entry and returns the new list. Throws when storage is full or blocked. */
export function storeSaved(userId: string, entry: SavedConsultation): SavedConsultation[] {
  const others = loadSaved(userId).filter((item) => item.id !== entry.id);
  return write(userId, [entry, ...others].slice(0, MAX_SAVED));
}

/** Returns the new list. Throws when storage is blocked. */
export function removeSaved(userId: string, id: string): SavedConsultation[] {
  return write(
    userId,
    loadSaved(userId).filter((item) => item.id !== id),
  );
}
