import { Router } from "express";
import { search, suggest } from "../controllers/search.controller.js";
import { validateQuery } from "../middleware/validate.js";
import { searchQuerySchema } from "../schemas/search.schema.js";
import { suggestQuerySchema } from "../schemas/suggest.schema.js";

export const searchRouter = Router();

searchRouter.get("/", validateQuery(searchQuerySchema), search);
searchRouter.get("/suggest", validateQuery(suggestQuerySchema), suggest);
