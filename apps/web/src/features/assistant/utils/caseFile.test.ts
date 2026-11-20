import { describe, expect, it } from "vitest";
import { ibuprofenDetail } from "../../../test/fixtures";
import { applyAnswer, avoidFor, emptyCaseFile, mergeUnique } from "./caseFile";

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

describe("avoidFor", () => {
  it("turns each reason into what the case file should avoid", () => {
    expect(avoidFor("Too expensive", ibuprofenDetail)).toBe("Expensive options");
    expect(avoidFor("I don’t swallow tablets", ibuprofenDetail)).toBe("Tablets");
    expect(avoidFor("Already tried", ibuprofenDetail)).toBe("Already tried Ibuprofen 400mg");
    expect(avoidFor("Other", ibuprofenDetail)).toBe("Not Ibuprofen 400mg");
  });
});
