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

export const productDetailSchema = productSchema
  .extend({
    sku: z.string().nullable().openapi({ example: "MD-0001" }),
    pzn: z.string().nullable().openapi({
      description: "Pharmazentralnummer, the German pharmaceutical product number",
      example: "04875159",
    }),
    packSize: z.string().nullable().openapi({ example: "20 tablets" }),
    dosageForm: z.string().nullable().openapi({ example: "Film-coated tablet" }),
    activeIngredients: z.array(z.string()).openapi({ example: ["Ibuprofen 400 mg"] }),
    usageInstructions: z.string().nullable().openapi({
      example: "Adults: 1 tablet with water, up to 3 times a day.",
    }),
    warnings: z.string().nullable().openapi({
      example: "Do not use with stomach ulcers. Do not take for more than 4 days.",
    }),
    requiresPrescription: z.boolean().openapi({
      description: "Prescription-only products cannot be bought without a prescription",
    }),
    stockQuantity: z.number().int().nonnegative().openapi({ example: 120 }),
    manufacturer: z.string().nullable().openapi({ example: "Reckitt" }),
  })
  .openapi("ProductDetail");

export const productIdParamsSchema = z
  .object({
    // Upper bound is the Postgres integer max; anything larger can never exist.
    id: z.coerce.number().int().min(1).max(2_147_483_647).openapi({ example: 1 }),
  })
  .strict();

export const productListResponseSchema = z
  .object({
    items: z.array(productSchema),
    total: z.number().int().openapi({ example: 12 }),
  })
  .openapi("ProductListResponse");

export type Product = z.infer<typeof productSchema>;
export type ProductDetail = z.infer<typeof productDetailSchema>;
export type ProductIdParams = z.infer<typeof productIdParamsSchema>;
export type ProductList = z.infer<typeof productListResponseSchema>;
