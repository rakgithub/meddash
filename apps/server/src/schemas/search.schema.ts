import { z } from "zod";
import "../openapi/extend.js";
import { emptyToUndefined } from "./emptyToUndefined.js";
import { productSchema } from "./product.schema.js";

export const SORT_OPTIONS = [
  "relevance",
  "price_asc",
  "price_desc",
  "name_asc",
  "name_desc",
] as const;
export const PAGE_SIZE = 10;

// `?q=` sends an empty string; treat empty/whitespace-only values as "not provided".
const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional(),
  );

// The filters shared by /search and /search/facets.
const filterFields = {
  q: optionalText(100).openapi({
    description: "Free-text search; every word must match",
    example: "ibuprofen",
  }),
  category: optionalText(50).openapi({
    description: "Exact category, case-insensitive",
    example: "pain-relief",
  }),
  brand: optionalText(50).openapi({
    description: "Exact brand, case-insensitive",
    example: "Nurofen",
  }),
  minPrice: z
    .preprocess(emptyToUndefined, z.coerce.number().finite().nonnegative().optional())
    .openapi({ description: "Minimum price (inclusive)", example: 5 }),
  maxPrice: z
    .preprocess(emptyToUndefined, z.coerce.number().finite().nonnegative().optional())
    .openapi({ description: "Maximum price (inclusive)", example: 20 }),
};

const priceRangeIsValid = (q: { minPrice?: number; maxPrice?: number }) =>
  q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice;
const priceRangeError = {
  message: "minPrice must be less than or equal to maxPrice",
  path: ["minPrice"],
};

export const facetsQuerySchema = z
  .object(filterFields)
  .strict()
  .refine(priceRangeIsValid, priceRangeError);

export const searchQuerySchema = z
  .object({
    ...filterFields,
    sort: z
      .preprocess(emptyToUndefined, z.enum(SORT_OPTIONS).default("relevance"))
      .openapi({ description: "Sort order", example: "price_asc" }),
    page: z
      .preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(1000).default(1))
      .openapi({ description: "1-based page number", example: 1 }),
  })
  .strict()
  .refine(priceRangeIsValid, priceRangeError);

export const searchResponseSchema = z
  .object({
    items: z.array(productSchema),
    pagination: z.object({
      page: z.number().int(),
      pageSize: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
    }),
  })
  .openapi("SearchResponse");

export const errorResponseSchema = z
  .object({
    error: z.object({
      message: z.string(),
      details: z.array(z.object({ field: z.string().optional(), message: z.string() })).optional(),
    }),
  })
  .openapi("ErrorResponse");

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type FacetsQuery = z.infer<typeof facetsQuerySchema>;
export type SortOption = (typeof SORT_OPTIONS)[number];
