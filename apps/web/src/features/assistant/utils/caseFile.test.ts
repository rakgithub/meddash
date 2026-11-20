import { describe, expect, it } from "vitest";
import { applyAnswer, emptyCaseFile, mergeSymptoms } from "./caseFile";

describe("mergeSymptoms", () => {
  it("adds new symptoms in order and skips ones already there, ignoring case", () => {
    expect(mergeSymptoms(["Sore throat"], ["fever", "sore throat", " Cough "])).toEqual([
      "Sore throat",
      "fever",
      "Cough",
    ]);
  });

  it("skips blank entries", () => {
    expect(mergeSymptoms([], ["  "])).toEqual([]);
  });
});

describe("applyAnswer", () => {
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
