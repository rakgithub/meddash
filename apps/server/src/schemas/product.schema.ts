import { z } from "zod";
import "../openapi/extend.js";

export const productSchema = z
  .object({
    id: z.string().openapi({ example: "1" }),
    name: z.string().openapi({ example: "Ibuprofen 400mg" }),
    description: z.string().openapi({ example: "Pain relief tablets for headaches and fever" }),
    category: z.string().openapi({ example: "pain-relief" }),
    brand: z.string().openapi({ example: "Nurofen" }),
    price: z.number().openapi({ example: 6.49 }),
    imageUrl: z.string().url().nullable().openapi({
      description: "Product photo; null when the product has none",
      example:
        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&h=450&fit=crop&q=75",
    }),
  })
  .openapi("Product");

export const productListResponseSchema = z
  .object({
    items: z.array(productSchema),
    total: z.number().int().openapi({ example: 12 }),
  })
  .openapi("ProductListResponse");

export type Product = z.infer<typeof productSchema>;
export type ProductList = z.infer<typeof productListResponseSchema>;
