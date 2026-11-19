import { describe, expect, it } from "vitest";
import { matchCategories } from "./matchCategories";

describe("matchCategories", () => {
  it("returns nothing for an empty term", () => {
    expect(matchCategories("  ")).toEqual([]);
  });

  it("matches the start of a category name, ignoring case", () => {
    expect(matchCategories("PAIN")).toEqual([{ slug: "pain-relief" }]);
  });

  it("matches the start of any word in the name", () => {
    expect(matchCategories("relief")).toEqual([{ slug: "pain-relief" }]);
  });

  it("matches keywords and says which one matched", () => {
    expect(matchCategories("headache")).toEqual([{ slug: "pain-relief", hint: "headache" }]);
  });

  it("matches multi-word keywords typed in full", () => {
    expect(matchCategories("sore thr")).toEqual([{ slug: "cold-flu", hint: "sore throat" }]);
  });

  it("can match several categories", () => {
    expect(matchCategories("s").map((m) => m.slug)).toEqual(["cold-flu", "skin-care", "vitamins"]);
  });

  it("does not match text in the middle of a word", () => {
    expect(matchCategories("ache")).toEqual([]);
  });
});
