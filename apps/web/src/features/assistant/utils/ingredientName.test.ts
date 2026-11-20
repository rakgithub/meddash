import { describe, expect, it } from "vitest";
import { ingredientName } from "./ingredientName";

describe("ingredientName", () => {
  it.each([
    ["Ibuprofen 400 mg", "Ibuprofen"],
    ["Cholecalciferol 25 µg (1000 IU)", "Cholecalciferol"],
    ["Xylometazoline hydrochloride 0.1 %", "Xylometazoline hydrochloride"],
    ["Urea 5 %", "Urea"],
    ["Ivy leaf dry extract", "Ivy leaf dry extract"],
    ["Glycerin", "Glycerin"],
  ])("%s -> %s", (raw, name) => {
    expect(ingredientName(raw)).toBe(name);
  });
});
