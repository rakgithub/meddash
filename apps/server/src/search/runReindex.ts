// `pnpm search:reindex`: rebuilds the products index from Postgres and switches the alias.
import { config } from "../config/env.js";
import { pool } from "../db/client.js";
import { countProducts, findProductRowsAfter } from "../db/products.repo.js";
import { createSearchClient } from "./client.js";
import { reindex } from "./reindex.js";

if (!config.opensearch) {
  console.error("OPENSEARCH_URL is not set; nothing to reindex (search uses Postgres).");
  process.exit(1);
}

// Bulk requests take far longer than a search; retry a dropped connection rather than start over.
const client = createSearchClient(config.opensearch, { requestTimeoutMs: 60_000, maxRetries: 3 });
try {
  const result = await reindex(client, { rowsAfter: findProductRowsAfter, count: countProducts });
  const deleted = result.deleted.length > 0 ? `; deleted ${result.deleted.join(", ")}` : "";
  process.stdout.write(`Indexed ${result.count} products into ${result.index}${deleted}.\n`);
} catch (error) {
  // The message names indices and counts only; the client's error can carry the request, so not it.
  console.error(`Reindex failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await Promise.all([client.close(), pool.end()]);
}
