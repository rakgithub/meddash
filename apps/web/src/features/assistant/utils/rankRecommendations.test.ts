import { describe, expect, it } from "vitest";
import { coughSyrupDetail, ibuprofenDetail } from "../../../test/fixtures";
import { rankRecommendations } from "./rankRecommendations";

const paracetamol = { ...ibuprofenDetail, id: "2", name: "Paracetamol 500mg" };

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
});
