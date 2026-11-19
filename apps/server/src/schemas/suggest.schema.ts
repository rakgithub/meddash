import { z } from "zod";
import "../openapi/extend.js";

export const SUGGEST_LIMIT = 5;

export const suggestQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100).openapi({
      description: "Prefix to match against the start of product names and brands",
      example: "ibu",
    }),
  })
  .strict();

export const suggestionSchema = z
  .object({
    id: z.string().openapi({ example: "1" }),
    name: z.string().openapi({ example: "Ibuprofen 400mg" }),
    brand: z.string().openapi({ example: "Nurofen" }),
  })
  .openapi("Suggestion");

export const suggestResponseSchema = z
  .object({
    items: z.array(suggestionSchema).max(SUGGEST_LIMIT),
  })
  .openapi("SuggestResponse");

export type SuggestQuery = z.infer<typeof suggestQuerySchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;
export type SuggestResponse = z.infer<typeof suggestResponseSchema>;
