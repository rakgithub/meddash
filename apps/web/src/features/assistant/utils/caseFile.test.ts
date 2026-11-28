import { describe, expect, it } from "vitest";
import { applyAnswer, emptyCaseFile, mergeUnique } from "./caseFile";

describe("mergeUnique", () => {
  it("adds new symptoms in order and skips ones already there, ignoring case", () => {
    expect(mergeUnique(["Sore throat"], ["fever", "sore throat", " Cough "])).toEqual([
      "Sore throat",
      "fever",
      "Cough",
    ]);
  });

  it("skips blank entries", () => {
    expect(mergeUnique([], ["  "])).toEqual([]);
  });
});

describe("applyAnswer", () => {
  it("adds a picked symptom to the case file without repeating one", () => {
    const once = applyAnswer(emptyCaseFile, "symptoms", "Sore throat");
    expect(once.symptoms).toEqual(["Sore throat"]);
    expect(applyAnswer(once, "symptoms", "sore throat").symptoms).toEqual(["Sore throat"]);
  });

  it("stores the duration", () => {
    expect(applyAnswer(emptyCaseFile, "duration", "2–3 days").duration).toBe("2–3 days");
  });

  it("stores who it is for", () => {
    expect(applyAnswer(emptyCaseFile, "forWhom", "child").forWhom).toBe("child");
  });

  it("ignores an unknown who-it-is-for value", () => {
    expect(applyAnswer(emptyCaseFile, "forWhom", "dog")).toBe(emptyCaseFile);
  });
});
