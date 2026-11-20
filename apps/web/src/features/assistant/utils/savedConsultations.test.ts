import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { coughSyrupDetail, ibuprofenDetail } from "../../../test/fixtures";
import type { Message } from "../types";
import { initialConsultation, type ConsultationState } from "./consultationReducer";
import {
  loadSaved,
  MAX_SAVED,
  removeSaved,
  storeSaved,
  summarize,
  summaryLine,
  suggestionCount,
} from "./savedConsultations";

const question: Message = {
  id: "u1",
  role: "user",
  parts: [{ kind: "text", text: "Sore throat" }],
  status: "done",
};

const reply: Message = {
  id: "a1",
  role: "assistant",
  status: "done",
  parts: [
    {
      kind: "products",
      items: [
        { product: ibuprofenDetail, reason: "Eases pain", fit: "best" },
        { product: coughSyrupDetail, reason: "Soothes", fit: "good" },
        { product: { ...ibuprofenDetail, id: "rx" }, reason: "Rx", fit: "locked" },
      ],
    },
  ],
};

const consultation: ConsultationState = {
  ...initialConsultation,
  messages: [question, reply],
  caseFile: {
    ...initialConsultation.caseFile,
    symptoms: ["Sore throat", "Fever"],
    duration: "2-3 days",
  },
};

const now = new Date("2026-11-20T10:00:00Z");

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("suggestionCount", () => {
  it("counts the latest suggestions, leaving out prescription-only ones", () => {
    expect(suggestionCount([question, reply])).toBe(2);
  });

  it("is 0 before any suggestions", () => {
    expect(suggestionCount([question])).toBe(0);
  });
});

describe("summarize", () => {
  it("titles the consultation by its symptoms and how long", () => {
    const entry = summarize(consultation, now);

    expect(entry).toMatchObject({
      id: "u1",
      savedAt: "2026-11-20T10:00:00.000Z",
      title: "Sore throat, fever, 2–3 days",
      suggestions: 2,
    });
    expect(entry && summaryLine(entry)).toBe("Sore throat, fever, 2–3 days → 2 suggestions");
  });

  it("has nothing to save before there are suggestions", () => {
    expect(summarize({ ...consultation, messages: [question] })).toBeNull();
    expect(summarize(initialConsultation)).toBeNull();
  });

  it("falls back to a plain title with no symptoms noted", () => {
    const entry = summarize({ ...consultation, caseFile: initialConsultation.caseFile });
    expect(entry?.title).toBe("Consultation");
  });
});

describe("storage", () => {
  function entry(id: string) {
    const summary = summarize(consultation, now);
    if (!summary) throw new Error("The fixture should have suggestions");
    return { ...summary, id };
  }

  it("keeps each user's consultations apart, newest first", () => {
    storeSaved("1", entry("a"));
    storeSaved("1", entry("b"));
    storeSaved("2", entry("c"));

    expect(loadSaved("1").map((s) => s.id)).toEqual(["b", "a"]);
    expect(loadSaved("2").map((s) => s.id)).toEqual(["c"]);
  });

  it("replaces a consultation saved again instead of adding it twice", () => {
    storeSaved("1", entry("a"));
    storeSaved("1", { ...entry("a"), suggestions: 5 });

    expect(loadSaved("1")).toHaveLength(1);
    expect(loadSaved("1")[0].suggestions).toBe(5);
  });

  it(`keeps at most ${MAX_SAVED}`, () => {
    for (let i = 0; i < MAX_SAVED + 2; i++) storeSaved("1", entry(`c${i}`));
    expect(loadSaved("1")).toHaveLength(MAX_SAVED);
    expect(loadSaved("1")[0].id).toBe(`c${MAX_SAVED + 1}`);
  });

  it("removes one", () => {
    storeSaved("1", entry("a"));
    storeSaved("1", entry("b"));
    expect(removeSaved("1", "a").map((s) => s.id)).toEqual(["b"]);
    expect(loadSaved("1").map((s) => s.id)).toEqual(["b"]);
  });

  it("drops entries it can't read and treats broken storage as empty", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(
      "meddash-consultations-1",
      JSON.stringify([entry("ok"), { id: "bad" }, "junk"]),
    );
    expect(loadSaved("1").map((s) => s.id)).toEqual(["ok"]);

    localStorage.setItem("meddash-consultations-1", "{not json");
    expect(loadSaved("1")).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });
});
