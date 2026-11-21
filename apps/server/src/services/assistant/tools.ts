import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { CatalogueItem, CatalogueSearch } from "../../db/products.repo.js";
import { type CaseFile, type MessagePart } from "../../schemas/assistant.schema.js";
import type { ProductDetail } from "../../schemas/product.schema.js";
import { resolveSuggestions } from "./recommendations.js";

/**
 * The model's tools. Each JSON schema is written next to the zod schema that checks the same input:
 * `strict: true` makes the API follow the JSON schema, and zod checks again before anything runs.
 * The list never changes between requests, so it stays in the prompt cache.
 */

const QUESTION_FIELDS = ["symptoms", "duration", "forWhom"] as const;

export const searchProductsInput = z.object({
  query: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(60).nullable(),
});

export const noteSymptomsInput = z.object({
  symptoms: z.array(z.string().trim().min(1).max(60)).min(1).max(10),
});

export const askQuestionInput = z.object({
  field: z.enum(QUESTION_FIELDS),
  question: z.string().trim().min(1).max(200),
  options: z
    .array(z.object({ label: z.string().trim().min(1).max(60), value: z.string().trim().min(1) }))
    .min(2)
    .max(6),
});

/**
 * The answers the case file can hold for these fields, as the web app's case file panel offers them
 * (apps/web/src/features/assistant/utils/caseFile.ts). The model's own options for these fields are
 * replaced, so the case file never gets values like "1_3_days" that the panel can't show.
 */
export const FIXED_OPTIONS = {
  duration: [
    { label: "Since today", value: "today" },
    { label: "2–3 days", value: "2-3 days" },
    { label: "About a week", value: "a week" },
    { label: "Longer", value: "longer" },
  ],
  forWhom: [
    { label: "Me", value: "me" },
    { label: "A child", value: "child" },
    { label: "Someone pregnant", value: "pregnant" },
    { label: "Someone over 65", value: "senior" },
  ],
} satisfies Record<"duration" | "forWhom", { label: string; value: string }[]>;

export const recommendProductsInput = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        reason: z.string().trim().min(1).max(200),
        fit: z.enum(["best", "good"]),
      }),
    )
    .min(1)
    .max(5),
});

const stringArray = { type: "array", items: { type: "string" } } as const;

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_products",
    description:
      "Search the pharmacy catalogue. Returns matching products as JSON (id, name, category, dosage form, " +
      "active ingredients, pack size, price, requiresPrescription, warnings). Search by symptom or " +
      "ingredient words, e.g. 'sore throat lozenge' or 'ibuprofen'. Only products returned here may be " +
      "recommended.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Symptom, ingredient or product words" },
        category: {
          type: ["string", "null"],
          description: "Optional catalogue category to search in, or null for all",
        },
      },
      required: ["query", "category"],
      additionalProperties: false,
    },
  },
  {
    name: "note_symptoms",
    description:
      "Record the symptoms the user has described so far, as short labels like 'Sore throat'. " +
      "They are shown to the user as chips. Call it when the user names new symptoms.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { symptoms: { ...stringArray, description: "Short symptom labels" } },
      required: ["symptoms"],
      additionalProperties: false,
    },
  },
  {
    name: "ask_question",
    description:
      "Ask the user one follow-up question with tap-to-answer options. Use it for how long the symptoms " +
      "have lasted (field 'duration'), who the product is for (field 'forWhom'), or which other symptoms " +
      "they have (field 'symptoms'). For 'duration' and 'forWhom' the pharmacy shows its own fixed " +
      "options, so the options you give for those are replaced. " +
      "Ask at most one question per turn, then wait for the answer.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        field: { type: "string", enum: [...QUESTION_FIELDS] },
        question: { type: "string" },
        options: {
          type: "array",
          items: {
            type: "object",
            properties: { label: { type: "string" }, value: { type: "string" } },
            required: ["label", "value"],
            additionalProperties: false,
          },
        },
      },
      required: ["field", "question", "options"],
      additionalProperties: false,
    },
  },
  {
    name: "recommend_products",
    description:
      "Show product cards to the user. Use only ids from search_products results in this turn. " +
      "Give each a one-line reason that names the symptom it helps with, and mark at most one as 'best'. " +
      "The pharmacy decides the final order and locks prescription-only products.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              reason: { type: "string" },
              fit: { type: "string", enum: ["best", "good"] },
            },
            required: ["id", "reason", "fit"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
];

export const SEARCH_LIMIT = 8;

/** What the tool handlers read and write during one turn. */
export interface ToolContext {
  caseFile: CaseFile;
  /** Ids returned by a search this turn: the only ones that may be recommended. */
  seenIds: Set<string>;
  searchCatalogue: (text: string, search: CatalogueSearch) => Promise<CatalogueItem[]>;
  findProductById: (id: number) => Promise<ProductDetail | null>;
}

/** The parts to show the user, and the result the model reads back. */
export interface ToolOutcome {
  parts: MessagePart[];
  result: string;
  isError: boolean;
}

const ok = (result: string, parts: MessagePart[] = []): ToolOutcome => ({
  parts,
  result,
  isError: false,
});
const failed = (result: string): ToolOutcome => ({ parts: [], result, isError: true });

export async function runTool(
  name: string,
  input: unknown,
  ctx: ToolContext,
): Promise<ToolOutcome> {
  switch (name) {
    case "search_products": {
      const parsed = searchProductsInput.safeParse(input);
      if (!parsed.success) return failed(parsed.error.issues[0].message);
      const { query, category } = parsed.data;
      const items = await ctx.searchCatalogue(query, {
        category: category ?? undefined,
        limit: SEARCH_LIMIT,
      });
      for (const item of items) ctx.seenIds.add(item.id);
      return ok(items.length > 0 ? JSON.stringify(items) : "No products found.");
    }
    case "note_symptoms": {
      const parsed = noteSymptomsInput.safeParse(input);
      if (!parsed.success) return failed(parsed.error.issues[0].message);
      return ok("Noted.", [{ kind: "symptoms", symptoms: parsed.data.symptoms }]);
    }
    case "ask_question": {
      const parsed = askQuestionInput.safeParse(input);
      if (!parsed.success) return failed(parsed.error.issues[0].message);
      const { field, question, options } = parsed.data;
      const shown = field === "symptoms" ? options : FIXED_OPTIONS[field];
      return ok("Shown to the user. End your turn and wait for the answer.", [
        { kind: "quickReplies", field, question, options: shown },
      ]);
    }
    case "recommend_products": {
      const parsed = recommendProductsInput.safeParse(input);
      if (!parsed.success) return failed(parsed.error.issues[0].message);
      const resolved = await resolveSuggestions(
        parsed.data.items,
        ctx.seenIds,
        ctx.caseFile,
        ctx.findProductById,
      );
      const notes = [
        `Shown: ${resolved.items.map((i) => i.product.id).join(", ") || "none"}.`,
        resolved.unknown.length > 0 &&
          `Not from a search this turn, left out: ${resolved.unknown.join(", ")}.`,
        resolved.avoided.length > 0 &&
          `Ruled out by what the user wants to avoid: ${resolved.avoided.join(", ")}.`,
      ].filter(Boolean);
      if (resolved.items.length === 0 && resolved.unavailable === 0) return ok(notes.join(" "));
      const unavailable = resolved.unavailable > 0 ? { unavailable: resolved.unavailable } : {};
      return ok(notes.join(" "), [{ kind: "products", items: resolved.items, ...unavailable }]);
    }
    default:
      return failed(`Unknown tool: ${name}`);
  }
}
