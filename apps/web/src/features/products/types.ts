import type { Category } from "./filterOptions";

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  /** Null when the product has no photo; the card shows a placeholder. */
  imageUrl: string | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SearchResponse {
  items: Product[];
  pagination: Pagination;
}

/** Filter form values. Kept as strings because they come straight from inputs; empty = not set. */
export interface ProductFilters {
  q: string;
  category: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
}

export const EMPTY_FILTERS: ProductFilters = {
  q: "",
  category: "",
  brand: "",
  minPrice: "",
  maxPrice: "",
};

/** Mirrors `suggestionSchema` in apps/server/src/schemas/suggest.schema.ts. */
export interface Suggestion {
  id: string;
  name: string;
  brand: string;
}

export type SuggestOption =
  { kind: "category"; slug: Category; hint?: string } | { kind: "product"; product: Suggestion };

export interface SuggestResponse {
  items: Suggestion[];
}

/** Mirrors `productDetailSchema` in apps/server/src/schemas/product.schema.ts. */
export interface ProductDetail extends Product {
  sku: string | null;
  /** Pharmazentralnummer, the German pharmaceutical product number. */
  pzn: string | null;
  packSize: string | null;
  dosageForm: string | null;
  activeIngredients: string[];
  usageInstructions: string | null;
  warnings: string | null;
  requiresPrescription: boolean;
  stockQuantity: number;
  manufacturer: string | null;
}
