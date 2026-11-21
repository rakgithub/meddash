import { describe, expect, it } from "vitest";
import { emptyCaseFile, product } from "../../test/fixtures.js";
import {
  cautionFor,
  isAvoided,
  rankRecommendations,
  resolveSuggestions,
} from "./recommendations.js";

const lozenge = product({ id: "1", name: "Throat Lozenges" });
const tablet = product({ id: "2", name: "Ibuprofen 400", dosageForm: "Film-coated tablet" });
const rx = product({ id: "3", name: "Antibiotic", requiresPrescription: true });
const notInPregnancy = product({
  id: "4",
  name: "Decongestant",
  warnings: "Take with food. Do not use during pregnancy.",
});
const catalogue = [lozenge, tablet, rx, notInPregnancy];
const find = async (id: number) => catalogue.find((p) => p.id === String(id)) ?? null;

describe("cautionFor", () => {
  it("returns the warning sentence that concerns who it is for", () => {
    expect(cautionFor(notInPregnancy.warnings, "pregnant")).toBe("Do not use during pregnancy.");
  });

  it.each([
    ["no warnings", null, "pregnant"],
    ["no answer yet", "Not for children.", null],
    ["the user themself", "Not for children.", "me"],
    ["an unrelated warning", "Take with food.", "child"],
  ] as const)("returns nothing for %s", (_name, warnings, forWhom) => {
    expect(cautionFor(warnings, forWhom)).toBeUndefined();
  });
});

describe("rankRecommendations", () => {
  it("locks prescription-only products and puts them last", () => {
    const ranked = rankRecommendations(
      [
        { product: rx, reason: "r", fit: "best" },
        { product: lozenge, reason: "r", fit: "good" },
      ],
      null,
    );
    expect(ranked.map((r) => [r.product.id, r.fit])).toEqual([
      ["1", "good"],
      ["3", "locked"],
    ]);
  });

  it("adds a caution and demotes a best fit whose warnings concern who it is for", () => {
    const [item] = rankRecommendations(
      [{ product: notInPregnancy, reason: "r", fit: "best" }],
      "pregnant",
    );
    expect(item).toMatchObject({ fit: "good", caution: "Do not use during pregnancy." });
  });
});

describe("isAvoided", () => {
  it("rules out swallowed forms when the user avoids tablets, but keeps lozenges", () => {
    expect(isAvoided(tablet, ["Tablets"])).toBe(true);
    expect(isAvoided(lozenge, ["Tablets"])).toBe(false);
  });

  it("rules out a product the user already tried or turned down", () => {
    expect(isAvoided(lozenge, ["Already tried Throat Lozenges"])).toBe(true);
    expect(isAvoided(lozenge, ["not throat lozenges"])).toBe(true);
    expect(isAvoided(lozenge, ["Expensive options"])).toBe(false);
  });
});

describe("resolveSuggestions", () => {
  it("keeps only ids a search returned, then applies avoid and the ranking", async () => {
    const result = await resolveSuggestions(
      [
        { id: "2", reason: "pain", fit: "best" },
        { id: "3", reason: "infection", fit: "good" },
        { id: "1", reason: "throat", fit: "good" },
        { id: "1", reason: "duplicate", fit: "best" },
        { id: "99", reason: "made up", fit: "best" },
      ],
      new Set(["1", "2", "3"]),
      { ...emptyCaseFile, avoid: ["Tablets"] },
      find,
    );
    expect(result.unknown).toEqual(["99"]);
    expect(result.avoided).toEqual(["2"]);
    expect(result.unavailable).toBe(0);
    expect(result.items.map((i) => [i.product.id, i.fit, i.reason])).toEqual([
      ["1", "good", "throat"],
      ["3", "locked", "infection"],
    ]);
  });

  it("counts products that were found in a search but can no longer be loaded", async () => {
    const result = await resolveSuggestions(
      [{ id: "50", reason: "gone", fit: "best" }],
      new Set(["50"]),
      emptyCaseFile,
      find,
    );
    expect(result).toEqual({ items: [], unknown: [], unavailable: 1, avoided: [] });
  });
});
