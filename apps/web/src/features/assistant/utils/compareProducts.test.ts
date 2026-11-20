import { describe, expect, it } from "vitest";
import { coughSyrupDetail, ibuprofenDetail, paracetamolDetail } from "../../../test/fixtures";
import { compareProducts, formatUnitPrice, unitPrice } from "./compareProducts";

function rowFor(key: string, products = [ibuprofenDetail, paracetamolDetail]) {
  const found = compareProducts(products).find((r) => r.key === key);
  if (!found) throw new Error(`no ${key} row`);
  return found;
}

describe("compareProducts", () => {
  it("has one value per product in every row, in the given order", () => {
    const rows = compareProducts([ibuprofenDetail, paracetamolDetail]);

    expect(rows.map((r) => r.label)).toEqual([
      "Active ingredients",
      "Dosage form",
      "Pack size",
      "Price",
      "Price per unit",
      "Warnings",
      "Stock",
    ]);
    expect(rows.every((r) => r.values.length === 2)).toBe(true);
    expect(rowFor("ingredients").values).toEqual(["Ibuprofen 400 mg", "Paracetamol 500 mg"]);
  });

  it("marks only the rows where the products differ", () => {
    expect(rowFor("packSize").differs).toBe(false); // both 20 tablets
    expect(rowFor("form").differs).toBe(true);
    expect(rowFor("warnings").differs).toBe(true);
    expect(rowFor("stock").values).toEqual(["In stock", "Only 3 left"]);
    expect(rowFor("stock").differs).toBe(true);
  });

  it("shows the price per tablet, per ml and so on", () => {
    const tenEuros = { ...ibuprofenDetail, price: 10 };

    expect(rowFor("unitPrice", [tenEuros]).values[0]).toBe("0,50\u00a0€ per tablet");
    expect(rowFor("unitPrice", [coughSyrupDetail]).values[0]).toContain("per ml");
  });

  it("falls back to a dash or 'None listed' for missing data", () => {
    const bare = {
      ...ibuprofenDetail,
      activeIngredients: [],
      dosageForm: null,
      packSize: null,
      warnings: null,
    };

    expect(rowFor("ingredients", [bare]).values).toEqual(["—"]);
    expect(rowFor("form", [bare]).values).toEqual(["—"]);
    expect(rowFor("packSize", [bare]).values).toEqual(["—"]);
    expect(rowFor("unitPrice", [bare]).values).toEqual(["—"]);
    expect(rowFor("warnings", [bare]).values).toEqual(["None listed"]);
  });
});

describe("unitPrice", () => {
  it("divides the price by the pack count and singularises the unit", () => {
    expect(unitPrice({ ...ibuprofenDetail, price: 10, packSize: "20 tablets" })).toEqual({
      amount: 0.5,
      unit: "tablet",
    });
    expect(unitPrice({ ...ibuprofenDetail, price: 10, packSize: "200 ml" })).toEqual({
      amount: 0.05,
      unit: "ml",
    });
  });

  it("reads a decimal comma", () => {
    expect(unitPrice({ ...ibuprofenDetail, price: 5, packSize: "2,5 ml" })?.amount).toBe(2);
  });

  it("is null when the pack size has no leading count or is zero", () => {
    expect(unitPrice({ ...ibuprofenDetail, packSize: "family pack" })).toBeNull();
    expect(unitPrice({ ...ibuprofenDetail, packSize: "0 tablets" })).toBeNull();
    expect(unitPrice({ ...ibuprofenDetail, packSize: null })).toBeNull();
  });
});

describe("formatUnitPrice", () => {
  it("keeps up to three decimals", () => {
    expect(formatUnitPrice({ amount: 0.0239, unit: "ml" })).toBe("0,024\u00a0€ per ml");
  });
});
