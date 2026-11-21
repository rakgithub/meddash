import { z } from "zod";
import "../openapi/extend.js";
import { productDetailSchema } from "./product.schema.js";

/** Cost guardrails from the plan: the request carries at most this much conversation. */
export const MAX_HISTORY_MESSAGES = 20;
export const MAX_USER_TEXT = 1000;
export const MAX_ASSISTANT_TEXT = 2000;

export const FOR_WHOM = ["me", "child", "pregnant", "senior"] as const;

const label = (max: number) => z.string().trim().min(1).max(max);
const productId = z.string().regex(/^[1-9]\d{0,8}$/, "Must be a product id");

export const caseFileSchema = z
  .object({
    symptoms: z
      .array(label(60))
      .max(20)
      .openapi({ example: ["Sore throat", "Fever"] }),
    duration: label(40).nullable().openapi({ example: "2-3 days" }),
    forWhom: z.enum(FOR_WHOM).nullable().openapi({ example: "me" }),
    avoid: z
      .array(label(60))
      .max(20)
      .openapi({ description: "What the user wants to steer away from", example: ["Tablets"] }),
  })
  .strict()
  .openapi("AssistantCaseFile");

const historyMessageSchema = z
  .discriminatedUnion("role", [
    z.object({ role: z.literal("user"), text: label(MAX_USER_TEXT) }).strict(),
    z
      .object({
        role: z.literal("assistant"),
        // Empty when the reply was only cards or an alert.
        text: z.string().trim().max(MAX_ASSISTANT_TEXT),
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
    z.object({
      kind: z.literal("alert"),
      level: z.enum(["urgent", "caution"]),
      title: z.string(),
      body: z.string(),
    }),
  ])
  .openapi("AssistantMessagePart");

export type CaseFile = z.infer<typeof caseFileSchema>;
export type AssistantMessageBody = z.infer<typeof assistantMessageBodySchema>;
export type MessagePart = z.infer<typeof messagePartSchema>;
export type AlertPart = Extract<MessagePart, { kind: "alert" }>;
