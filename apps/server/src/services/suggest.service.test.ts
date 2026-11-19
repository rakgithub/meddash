import { describe, expect, it, vi } from "vitest";
import { SUGGEST_LIMIT } from "../schemas/suggest.schema.js";
import { suggestProducts } from "./suggest.service.js";

describe("suggestProducts", () => {
  it("asks the data source for at most SUGGEST_LIMIT matches for q", async () => {
    const find = vi.fn(async () => [{ id: "1", name: "Gel", brand: "Acme" }]);
    const result = await suggestProducts("ge", find);
    expect(find).toHaveBeenCalledWith("ge", SUGGEST_LIMIT);
    expect(result).toEqual({ items: [{ id: "1", name: "Gel", brand: "Acme" }] });
  });
});
