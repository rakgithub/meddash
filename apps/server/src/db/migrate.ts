import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client.js";

// apps/server/drizzle, from both src/db and dist/db.
const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

try {
  await migrate(db, { migrationsFolder });
} finally {
  await pool.end();
}
