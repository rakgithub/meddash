import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "../config/env.js";
import * as schema from "./schema.js";

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  // Fail fast instead of hanging requests (and graceful shutdown) on an unreachable or stuck DB.
  connectionTimeoutMillis: 5_000,
  statement_timeout: 10_000,
});

// An idle client can error (e.g. the DB restarts); without a listener that crashes the process.
pool.on("error", (err) => {
  console.error("Postgres pool error:", err.message);
});

export const db = drizzle(pool, { schema });
export type Db = typeof db;
