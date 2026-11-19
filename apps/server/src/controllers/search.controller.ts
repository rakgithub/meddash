import type { Request, Response } from "express";
import type { SearchQuery } from "../schemas/search.schema.js";
import type { SuggestQuery, SuggestResponse } from "../schemas/suggest.schema.js";
import { searchProducts, type SearchResult } from "../services/search.service.js";
import { suggestProducts } from "../services/suggest.service.js";

export function search(_req: Request, res: Response<SearchResult, { query: SearchQuery }>) {
  res.json(searchProducts(res.locals.query));
}

export function suggest(_req: Request, res: Response<SuggestResponse, { query: SuggestQuery }>) {
  res.json(suggestProducts(res.locals.query.q));
}
