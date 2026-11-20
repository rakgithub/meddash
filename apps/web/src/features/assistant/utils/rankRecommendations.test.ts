import { describe, expect, it } from "vitest";
import { coughSyrupDetail, ibuprofenDetail } from "../../../test/fixtures";
import { cautionFor, rankRecommendations } from "./rankRecommendations";

const paracetamol = { ...ibuprofenDetail, id: "2", name: "Paracetamol 500mg" };
const ibuprofenWarned = {
  ...ibuprofenDetail,
  warnings: "Do not use with stomach ulcers or in the last 3 months of pregnancy. Take with food.",
};

describe("rankRecommendations", () => {
  it("locks a prescription-only product even when it was suggested as best", () => {
    const [item] = rankRecommendations([
      { product: coughSyrupDetail, reason: "Soothes a cough", fit: "best" },
    ]);

    expect(item.fit).toBe("locked");
  });

  it("puts best fits first and locked ones last, keeping the order otherwise", () => {
    const ranked = rankRecommendations([
      { product: coughSyrupDetail, reason: "", fit: "good" },
      { product: paracetamol, reason: "", fit: "good" },
      { product: ibuprofenDetail, reason: "", fit: "best" },
    ]);

    expect(ranked.map((r) => [r.product.id, r.fit])).toEqual([
      ["1", "best"],
      ["2", "good"],
      ["7", "locked"],
    ]);
  });

  it("adds a caution and drops a best fit to good when a warning concerns who it is for", () => {
    const [item] = rankRecommendations(
      [{ product: ibuprofenWarned, reason: "", fit: "best" }],
      "pregnant",
    );

    expect(item).toMatchObject({
      fit: "good",
      caution: "Do not use with stomach ulcers or in the last 3 months of pregnancy.",
    });
  });

  it("leaves a product alone when its warnings don't concern who it is for", () => {
    const [item] = rankRecommendations(
      [{ product: ibuprofenWarned, reason: "", fit: "best" }],
      "me",
    );

    expect(item).toEqual({ product: ibuprofenWarned, reason: "", fit: "best" });
  });
});

describe("cautionFor", () => {
  it.each([
    ["Not suitable for children under 6 years.", "child"],
    ["Ask a doctor first if you have impaired kidney function. May cause loose stools.", "senior"],
    ["Avoid while breast-feeding.", "pregnant"],
  ] as const)("finds %j for %s", (warnings, forWhom) => {
    expect(cautionFor(warnings, forWhom)).toBe(warnings.split(/(?<=\.) /)[0]);
  });

  it("finds nothing without warnings, without a group, or for the user themself", () => {
    expect(cautionFor(null, "child")).toBeUndefined();
    expect(cautionFor("Not for children.", null)).toBeUndefined();
    expect(cautionFor("Not for children.", "me")).toBeUndefined();
    expect(cautionFor("Contains sorbitol.", "child")).toBeUndefined();
  });
});
