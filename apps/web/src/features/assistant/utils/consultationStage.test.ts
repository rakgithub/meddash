import { describe, expect, it } from "vitest";
import type { CaseFile, Message } from "../types";
import { consultationStage } from "./consultationStage";

const empty: CaseFile = { symptoms: [], duration: null, forWhom: null, avoid: [] };
const withSymptoms: CaseFile = { ...empty, symptoms: ["Sore throat"] };
const reply = (parts: Message["parts"]): Message => ({
  id: "a1",
  role: "assistant",
  parts,
  status: "done",
});

describe("consultationStage", () => {
  it("starts at describing the symptoms", () => {
    expect(consultationStage([], empty)).toBe("symptoms");
  });

  it("moves to the questions once a symptom is noted", () => {
    expect(consultationStage([reply([{ kind: "text", text: "Hi" }])], withSymptoms)).toBe(
      "questions",
    );
  });

  it("reaches suggestions when products are shown or loading", () => {
    expect(
      consultationStage([reply([{ kind: "products", items: [], loading: 3 }])], withSymptoms),
    ).toBe("suggestions");
  });

  it("doesn't count an empty product list as suggestions", () => {
    expect(consultationStage([reply([{ kind: "products", items: [] }])], withSymptoms)).toBe(
      "questions",
    );
  });
});
