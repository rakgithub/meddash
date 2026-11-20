import { z } from "zod";
import "../openapi/extend.js";

export const orderStatusSchema = z
  .enum(["pending_payment", "paid", "failed", "cancelled"])
  .openapi("OrderStatus");

export const orderParamsSchema = z
  .object({
    // Upper bound is the Postgres integer max; anything larger can never exist.
    id: z.coerce.number().int().min(1).max(2_147_483_647).openapi({ example: 1 }),
  })
  .strict();

export const orderSummarySchema = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    status: orderStatusSchema,
    total: z.number().openapi({ example: 12.98 }),
    itemCount: z.number().int().openapi({ description: "Sum of the quantities", example: 2 }),
    createdAt: z.string().datetime().openapi({ example: "2026-11-20T10:15:00.000Z" }),
  })
  .openapi("OrderSummary");

export const orderItemSchema = z
  .object({
    productId: z
      .string()
      .nullable()
      .openapi({ description: "Null when the product was deleted since", example: "1" }),
    name: z.string().openapi({ description: "Name at order time", example: "Ibuprofen 400mg" }),
    unitPrice: z.number().openapi({ description: "Price at order time", example: 6.49 }),
    quantity: z.number().int().openapi({ example: 2 }),
    lineTotal: z.number().openapi({ example: 12.98 }),
  })
  .openapi("OrderItem");

export const orderSchema = orderSummarySchema
  .extend({ items: z.array(orderItemSchema) })
  .openapi("Order");

export const orderListSchema = z
  .object({ orders: z.array(orderSummarySchema) })
  .openapi("OrderList");

export type OrderParams = z.infer<typeof orderParamsSchema>;
export type OrderSummary = z.infer<typeof orderSummarySchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderList = z.infer<typeof orderListSchema>;
