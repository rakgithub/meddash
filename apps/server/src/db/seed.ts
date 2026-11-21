import { sql } from "drizzle-orm";
import { config } from "../config/env.js";
import { db, pool } from "./client.js";
import { products } from "./schema.js";
import { seedProducts } from "./seed-data.js";
import { seedRefusal } from "./seedGuard.js";

const refusal = seedRefusal(process.env, config.databaseUrl);
if (refusal) {
  console.error(`Refusing to seed: ${refusal}.`);
  process.exit(1);
}

// Truncate and re-insert: replaces all products. CASCADE also empties cart_items, whose
// product ids would no longer mean the same products.
try {
  await db.transaction(async (tx) => {
    await tx.execute(sql`TRUNCATE ${products} RESTART IDENTITY CASCADE`);
    await tx
      .insert(products)
      .values(seedProducts.map((p) => ({ ...p, id: Number(p.id), price: p.price.toFixed(2) })));
    // Explicit ids don't advance the identity sequence; move it past them.
    await tx.execute(
      sql`SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT max(id) FROM ${products}))`,
    );
  });
} finally {
  await pool.end();
}
