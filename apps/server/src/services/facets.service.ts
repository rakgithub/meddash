import { findFacetData } from "../db/products.repo.js";
import { PRICE_BUCKETS, type FacetsResponse, type PriceBucket } from "../schemas/facets.schema.js";
import type { FacetsQuery } from "../schemas/search.schema.js";
import { splitTerms } from "./search.service.js";

const cents = (n: number) => Math.round(n * 100) / 100;

/** Splits the price spread into equal-width bands; every product lands in exactly one. */
export function priceBuckets(prices: number[]): PriceBucket[] {
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return [{ from: min, to: max, count: prices.length }];

  const width = (max - min) / PRICE_BUCKETS;
  const buckets = Array.from({ length: PRICE_BUCKETS }, (_, i) => ({
    from: cents(min + i * width),
    to: cents(min + (i + 1) * width),
    count: 0,
  }));
  for (const price of prices) {
    // The highest price sits on the last edge, so it belongs in the last band.
    buckets[Math.min(Math.floor((price - min) / width), PRICE_BUCKETS - 1)].count++;
  }
  return buckets;
}

/** Counts for the filter UI: how many products each category and brand holds, and the price spread. */
export async function getFacets(query: FacetsQuery, find = findFacetData): Promise<FacetsResponse> {
  const { q, category, brand, minPrice, maxPrice } = query;
  const { categories, brands, prices } = await find({
    terms: splitTerms(q),
    category,
    brand,
    minPrice,
    maxPrice,
  });
  return {
    categories,
    brands,
    price:
      prices.length === 0
        ? null
        : { min: Math.min(...prices), max: Math.max(...prices), buckets: priceBuckets(prices) },
  };
}
