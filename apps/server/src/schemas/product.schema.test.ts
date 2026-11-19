import { describe, expect, it } from "vitest";
import { productIdParamsSchema } from "./product.schema.js";

describe("productIdParamsSchema", () => {
  it("parses a numeric id string", () => {
    expect(productIdParamsSchema.parse({ id: "12" })).toEqual({ id: 12 });
  });

  it.each(["abc", "0", "-1", "1.5", "", "2147483648"])("rejects %j", (id) => {
    expect(productIdParamsSchema.safeParse({ id }).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(productIdParamsSchema.safeParse({ id: "1", extra: "x" }).success).toBe(false);
  });
});
