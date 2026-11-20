import { describe, expect, it } from "vitest";
import { looksLikeSymptom } from "./looksLikeSymptom";

describe("looksLikeSymptom", () => {
  it("recognises common symptom phrases", () => {
    expect(looksLikeSymptom("sore throat")).toBe(true);
    expect(looksLikeSymptom("Headache since Monday")).toBe(true);
    expect(looksLikeSymptom("can't sleep")).toBe(true);
    expect(looksLikeSymptom("hayfever")).toBe(true);
  });

  it("ignores product and brand names", () => {
    expect(looksLikeSymptom("ibuprofen")).toBe(false);
    expect(looksLikeSymptom("Nurofen")).toBe(false);
    expect(looksLikeSymptom("vitamin D")).toBe(false);
  });

  it("only matches at the start of a word", () => {
    expect(looksLikeSymptom("teaching")).toBe(false);
    expect(looksLikeSymptom("coldcream")).toBe(false);
  });
});
