import { z } from "zod";
import "../openapi/extend.js";
import { productSchema } from "./product.schema.js";

/** Most of one product a cart may hold, whatever the stock. */
export const MAX_QUANTITY_PER_PRODUCT = 10;

const quantity = z
  .number()
  .int()
  .min(1)
  .max(MAX_QUANTITY_PER_PRODUCT)
  .openapi({ description: `1 to ${MAX_QUANTITY_PER_PRODUCT}`, example: 2 });

export const addCartItemBodySchema = z
  .object({
    // A string like Product.id, so the web app can send the id it already has.
    // Nine digits at most keeps it inside the Postgres integer range.
    productId: z
      .string()
      .regex(/^[1-9]\d{0,8}$/, "Must be a product id")
      .transform(Number)
      .openapi({ example: "1" }),
    quantity: quantity.openapi({ description: "Added to the quantity already in the cart" }),
  })
  .strict();

export const updateCartItemBodySchema = z
  .object({ quantity: quantity.openapi({ description: "Replaces the quantity in the cart" }) })
  .strict();

export const cartItemParamsSchema = z
  .object({
    // Upper bound is the Postgres integer max; anything larger can never exist.
    productId: z.coerce.number().int().min(1).max(2_147_483_647).openapi({ example: 1 }),
  })
  .strict();

export const cartLineSchema = z
  .object({
    product: productSchema,
    quantity: z.number().int().openapi({ example: 2 }),
    lineTotal: z.number().openapi({ description: "Current price times quantity", example: 12.98 }),
  })
  .openapi("CartLine");

export const cartSchema = z
  .object({
    items: z.array(cartLineSchema),
    itemCount: z.number().int().openapi({ description: "Sum of the quantities", example: 2 }),
    subtotal: z.number().openapi({ example: 12.98 }),
  })
  .openapi("Cart");

export type AddCartItemBody = z.infer<typeof addCartItemBodySchema>;
export type UpdateCartItemBody = z.infer<typeof updateCartItemBodySchema>;
export type CartItemParams = z.infer<typeof cartItemParamsSchema>;
export type CartLine = z.infer<typeof cartLineSchema>;
export type Cart = z.infer<typeof cartSchema>;
