import { sql } from "drizzle-orm";
import { index, integer, numeric, pgTable, text } from "drizzle-orm/pg-core";

export const products = pgTable(
  "products",
  {
    // "By default" so the seed can keep the catalogue's existing ids.
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    name: text().notNull(),
    description: text().notNull(),
    category: text().notNull(),
    brand: text().notNull(),
    price: numeric({ precision: 10, scale: 2 }).notNull(),
    imageUrl: text("image_url"),
  },
  // Each index matches a query in products.repo.ts.
  (t) => [
    index("products_category_lower_idx").on(sql`lower(${t.category})`),
    index("products_brand_lower_idx").on(sql`lower(${t.brand})`),
    index("products_price_idx").on(t.price),
    // text_pattern_ops lets `lower(name) LIKE 'ibu%'` use the index under any collation.
    index("products_name_lower_prefix_idx").on(sql`lower(${t.name}) text_pattern_ops`),
  ],
);

export type ProductRow = typeof products.$inferSelect;
