import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import type { FacetsResponse } from "../schemas/facets.schema.js";
import type { FacetsQuery, SearchQuery } from "../schemas/search.schema.js";
import type { SuggestQuery, SuggestResponse } from "../schemas/suggest.schema.js";
import { getFacets } from "../services/facets.service.js";
import { searchProducts, type SearchResult } from "../services/search.service.js";
import { suggestProducts } from "../services/suggest.service.js";

export const search = asyncHandler(
  async (_req: Request, res: Response<SearchResult, { query: SearchQuery }>) => {
    res.json(await searchProducts(res.locals.query));
  },
);

export const suggest = asyncHandler(
  async (_req: Request, res: Response<SuggestResponse, { query: SuggestQuery }>) => {
    res.json(await suggestProducts(res.locals.query.q));
  },
);

export const facets = asyncHandler(
  async (_req: Request, res: Response<FacetsResponse, { query: FacetsQuery }>) => {
    res.json(await getFacets(res.locals.query));
  },
);
