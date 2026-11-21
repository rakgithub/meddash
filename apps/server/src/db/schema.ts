import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

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
    // Detail fields. Nullable text means "not known"; the defaults let the migration
    // apply to a catalogue that already has rows.
    sku: text().unique(),
    pzn: text(),
    packSize: text("pack_size"),
    dosageForm: text("dosage_form"),
    activeIngredients: text("active_ingredients")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    usageInstructions: text("usage_instructions"),
    warnings: text(),
    requiresPrescription: boolean("requires_prescription").notNull().default(false),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    manufacturer: text(),
    // Full-text search for the assistant. Name and ingredients weigh most, so "ibuprofen" ranks the
    // ibuprofen products above ones that only mention it. text_array_to_string is from 0006.
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', name), 'A') || setweight(to_tsvector('english', text_array_to_string(active_ingredients)), 'A') || setweight(to_tsvector('english', brand || ' ' || category), 'B') || setweight(to_tsvector('english', description), 'C')`,
    ),
  },
  // Each index matches a query in products.repo.ts.
  (t) => [
    index("products_category_lower_idx").on(sql`lower(${t.category})`),
    index("products_brand_lower_idx").on(sql`lower(${t.brand})`),
    index("products_price_idx").on(t.price),
    // text_pattern_ops lets `lower(name) LIKE 'ibu%'` use the index under any collation.
    index("products_name_lower_prefix_idx").on(sql`lower(${t.name}) text_pattern_ops`),
    index("products_search_vector_idx").using("gin", t.searchVector),
  ],
);

// The search vector is only for WHERE/ORDER BY; reads never select it.
export type ProductRow = Omit<typeof products.$inferSelect, "searchVector">;

export const userRole = pgEnum("user_role", ["customer", "admin"]);

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  // Stored lower-cased (the zod schema normalises it), so the unique index is case-insensitive.
  email: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text().notNull(),
  role: userRole().notNull().default("customer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UserRow = typeof users.$inferSelect;

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// One cart per user, created on the first add.
export const carts = pgTable("carts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const cartItems = pgTable(
  "cart_items",
  {
    cartId: integer("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer().notNull(),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.cartId, t.productId] }),
    check("cart_items_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "failed",
  "cancelled",
]);

export const orders = pgTable(
  "orders",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: orderStatus().notNull().default("pending_payment"),
    total: numeric({ precision: 10, scale: 2 }).notNull(),
    ...timestamps,
  },
  // Matches the list query: one user's orders, newest first.
  (t) => [index("orders_user_created_idx").on(t.userId, t.createdAt)],
);

// name and unit_price are copied from the product at order time, so later catalogue edits
// do not change past orders. product_id is only a link back and goes null if the product is deleted.
export const orderItems = pgTable(
  "order_items",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    name: text().notNull(),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    quantity: integer().notNull(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
  ],
);
