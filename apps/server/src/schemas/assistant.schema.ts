import { z } from "zod";
import "../openapi/extend.js";
import { productDetailSchema } from "./product.schema.js";

/** Cost guardrails from the plan: the request carries at most this much conversation. */
export const MAX_HISTORY_MESSAGES = 20;
export const MAX_USER_TEXT = 1000;
export const MAX_ASSISTANT_TEXT = 2000;

export const FOR_WHOM = ["me", "child", "pregnant", "senior"] as const;

const label = (max: number) => z.string().trim().min(1).max(max);
/**
 * For context the server only needs the gist of: cut to `max` instead of rejecting, so one long
 * symptom or reply can't make every later turn fail. Still bounded overall by the JSON body limit.
 */
const clipped = (max: number) =>
  z
    .string()
    .trim()
    .transform((s) => s.slice(0, max));
const clippedList = (max: number, items: number) =>
  z.array(clipped(max)).transform((list) => list.filter(Boolean).slice(0, items));
const productId = z.string().regex(/^[1-9]\d{0,8}$/, "Must be a product id");

export const caseFileSchema = z
  .object({
    symptoms: clippedList(60, 20).openapi({
      description: "Each cut to 60 characters, at most 20 kept",
      example: ["Sore throat", "Fever"],
    }),
    duration: clipped(40).nullable().openapi({ example: "2-3 days" }),
    forWhom: z.enum(FOR_WHOM).nullable().openapi({ example: "me" }),
    avoid: clippedList(60, 20).openapi({
      description:
        "What the user wants to steer away from; each cut to 60 characters, at most 20 kept",
      example: ["Tablets"],
    }),
  })
  .strict()
  .openapi("AssistantCaseFile");

const historyMessageSchema = z
  .discriminatedUnion("role", [
    z.object({ role: z.literal("user"), text: clipped(MAX_USER_TEXT) }).strict(),
    z
      .object({
        role: z.literal("assistant"),
        // Empty when the reply was only cards or an alert. A full reply can be longer than this.
        text: clipped(MAX_ASSISTANT_TEXT).openapi({
          description: `Cut to ${MAX_ASSISTANT_TEXT} characters`,
        }),
        productIds: z
          .array(productId)
          .max(10)
          .openapi({ description: "Products suggested in this reply", example: ["1", "8"] }),
      })
      .strict(),
  ])
  .openapi("AssistantHistoryMessage");

export const assistantMessageBodySchema = z
  .object({
    caseFile: caseFileSchema,
    history: z
      .array(historyMessageSchema)
      .max(MAX_HISTORY_MESSAGES)
      .openapi({
        description: `The condensed conversation so far, at most ${MAX_HISTORY_MESSAGES}`,
      }),
    userText: label(MAX_USER_TEXT).openapi({ example: "Sore throat and a temperature" }),
  })
  .strict();

const thinkingStepSchema = z.object({ label: z.string(), done: z.boolean() });
const quickReplySchema = z.object({ label: z.string(), value: z.string() });

export const recommendationSchema = z
  .object({
    product: productDetailSchema,
    reason: z.string().openapi({ description: 'The "Why this?" line' }),
    fit: z.enum(["best", "good", "locked"]).openapi({
      description: "`locked` = prescription-only: shown greyed out, never first",
    }),
    caution: z.string().optional(),
  })
  .openapi("AssistantRecommendation");

const alertPartSchema = z.object({
  kind: z.literal("alert"),
  level: z.enum(["urgent", "caution"]),
  title: z.string(),
  body: z.string(),
});

/** Mirrors `MessagePart` in apps/web/src/features/assistant/types.ts, minus the client-only `ruledOut`. */
export const messagePartSchema = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("text"), text: z.string() }),
    z.object({ kind: z.literal("thinking"), steps: z.array(thinkingStepSchema) }),
    z.object({ kind: z.literal("symptoms"), symptoms: z.array(z.string()) }),
    z.object({
      kind: z.literal("quickReplies"),
      question: z.string(),
      field: z.enum(["symptoms", "duration", "forWhom"]),
      options: z.array(quickReplySchema),
    }),
    z.object({
      kind: z.literal("products"),
      items: z.array(recommendationSchema),
      loading: z.number().int().nonnegative().optional(),
      unavailable: z.number().int().nonnegative().optional(),
    }),
    alertPartSchema,
  ])
  .openapi("AssistantMessagePart");

export const MAX_COMPARE_QUESTION = 300;

/** The rows of the web compare table (`CompareRowKey` in apps/web/.../utils/compareProducts.ts). */
export const COMPARE_ROWS = [
  "ingredients",
  "form",
  "packSize",
  "price",
  "unitPrice",
  "warnings",
  "stock",
] as const;

export const assistantCompareBodySchema = z
  .object({
    productIds: z
      .array(productId)
      .min(2)
      .max(4)
      .refine((ids) => new Set(ids).size === ids.length, "Product ids must be different")
      .openapi({ description: "The products being compared, in table order", example: ["1", "2"] }),
    question: label(MAX_COMPARE_QUESTION).openapi({ example: "Which is gentler on the stomach?" }),
  })
  .strict();

/** Mirrors `CompareEvent` in apps/web/src/features/assistant/api/askCompare.ts. */
export const compareEventSchema = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("text"), text: z.string() }),
    z.object({
      kind: z.literal("row"),
      row: z.enum(COMPARE_ROWS).openapi({ description: "The table row the answer is about" }),
    }),
    alertPartSchema,
  ])
  .openapi("AssistantCompareEvent");

export type CaseFile = z.infer<typeof caseFileSchema>;
export type AssistantCompareBody = z.infer<typeof assistantCompareBodySchema>;
export type CompareEvent = z.infer<typeof compareEventSchema>;
export type CompareRow = (typeof COMPARE_ROWS)[number];
export type AssistantMessageBody = z.infer<typeof assistantMessageBodySchema>;
export type MessagePart = z.infer<typeof messagePartSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export type AlertPart = Extract<MessagePart, { kind: "alert" }>;
