import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import type { SearchQuery } from "../schemas/search.schema.js";
import type { SuggestQuery, SuggestResponse } from "../schemas/suggest.schema.js";
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
