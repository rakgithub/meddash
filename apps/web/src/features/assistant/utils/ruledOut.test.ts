import { describe, expect, it } from "vitest";
import { ibuprofenDetail } from "../../../test/fixtures";
import type { Recommendation } from "../types";
import { ruleOut } from "./ruledOut";

function item(id: string, dosageForm: string, fit: Recommendation["fit"]): Recommendation {
  return { product: { ...ibuprofenDetail, id, name: `P${id}`, dosageForm }, reason: "", fit };
}

describe("ruleOut", () => {
  it("returns the same list when nothing is ruled out", () => {
    const items = [item("1", "Syrup", "best")];

    expect(ruleOut(items, [], [])).toBe(items);
  });

  it("drops dismissed products", () => {
    const items = [item("1", "Syrup", "best"), item("2", "Syrup", "good")];

    expect(ruleOut(items, ["2"], []).map((i) => i.product.id)).toEqual(["1"]);
  });

  it("drops tablets and capsules when the user avoids tablets, but keeps lozenges", () => {
    const items = [
      item("1", "Film-coated tablet", "best"),
      item("2", "Capsule", "good"),
      item("3", "Lozenge", "good"),
    ];

    expect(ruleOut(items, [], ["tablets"]).map((i) => i.product.id)).toEqual(["3"]);
  });

  it("promotes the first good fit when the best fit goes", () => {
    const items = [
      item("1", "Syrup", "best"),
      item("2", "Syrup", "good"),
      item("3", "Syrup", "good"),
    ];

    expect(ruleOut(items, ["1"], []).map((i) => i.fit)).toEqual(["best", "good"]);
  });

  it("leaves the fits alone when the removed product was not the best fit", () => {
    const items = [item("1", "Syrup", "good"), item("2", "Syrup", "good")];

    expect(ruleOut(items, ["1"], []).map((i) => i.fit)).toEqual(["good"]);
  });

  it("never promotes a locked product", () => {
    const items = [item("1", "Syrup", "best"), item("2", "Syrup", "locked")];

    expect(ruleOut(items, ["1"], []).map((i) => i.fit)).toEqual(["locked"]);
  });
});
