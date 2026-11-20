import { z } from "zod";
import "../openapi/extend.js";

export const PRICE_BUCKETS = 8;

export const facetValueSchema = z
  .object({
    value: z.string().openapi({ example: "pain-relief" }),
    count: z.number().int().openapi({ description: "Matching products", example: 3 }),
  })
  .openapi("FacetValue");

export const priceBucketSchema = z
  .object({
    from: z.number().openapi({ example: 5 }),
    to: z.number().openapi({ example: 7.5 }),
    count: z.number().int().openapi({ example: 4 }),
  })
  .openapi("PriceBucket");

export const facetsResponseSchema = z
  .object({
    categories: z.array(facetValueSchema).openapi({
      description: "Counts ignore the `category` filter, so every category stays visible",
    }),
    brands: z.array(facetValueSchema).openapi({
      description: "Counts ignore the `brand` filter, so every brand stays visible",
    }),
    price: z
      .object({
        min: z.number().openapi({ example: 3.99 }),
        max: z.number().openapi({ example: 18.5 }),
        buckets: z.array(priceBucketSchema).max(PRICE_BUCKETS),
      })
      .nullable()
      .openapi({
        description:
          "Price spread of the products that match, ignoring `minPrice` and `maxPrice`. Null when nothing matches.",
      }),
  })
  .openapi("FacetsResponse");

export type FacetValue = z.infer<typeof facetValueSchema>;
export type PriceBucket = z.infer<typeof priceBucketSchema>;
export type FacetsResponse = z.infer<typeof facetsResponseSchema>;
