import { describe, expect, it } from "vitest";
import type { Product } from "../types/product.js";
import { suggestProducts } from "./suggest.service.js";

const make = (id: string, name: string, brand = "Brand"): Product => ({
  id,
  name,
  brand,
  description: "aspirin in the description should never match",
  category: "cat",
  price: 1,
});

const ids = (q: string, data: Product[]) => suggestProducts(q, data).items.map((s) => s.id);

describe("suggestProducts", () => {
  it("matches the start of the name, case-insensitively", () => {
    const data = [make("1", "Aspirin 100"), make("2", "Baby Aspirin"), make("3", "aspirin gel")];
    expect(ids("ASP", data)).toEqual(["1", "3"]);
  });

  it("matches the start of the brand", () => {
    const data = [make("1", "Gel", "Nurofen"), make("2", "Spray", "Otriven")];
    expect(ids("nur", data)).toEqual(["1"]);
  });

  it("ranks name matches above brand-only matches", () => {
    const data = [make("brand", "Gel", "Nurofen"), make("name", "Nurse Kit", "Other")];
    expect(ids("nur", data)).toEqual(["name", "brand"]);
  });

  it("does not match description text or the middle of a word", () => {
    expect(ids("aspirin", [make("1", "Gel")])).toEqual([]);
    expect(ids("pirin", [make("1", "Aspirin")])).toEqual([]);
  });

  it("lists a product once even if both name and brand match", () => {
    expect(ids("eu", [make("1", "Eucerin Cream", "Eucerin")])).toEqual(["1"]);
  });

  it("returns at most 5 suggestions", () => {
    const data = Array.from({ length: 8 }, (_, i) => make(String(i), `Vitamin ${i}`));
    expect(ids("vit", data)).toEqual(["0", "1", "2", "3", "4"]);
  });

  it("returns only id, name and brand", () => {
    expect(suggestProducts("gel", [make("1", "Gel", "Acme")]).items).toEqual([
      { id: "1", name: "Gel", brand: "Acme" },
    ]);
  });
});
