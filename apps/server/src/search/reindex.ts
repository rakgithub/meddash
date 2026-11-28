import type { Client } from "@opensearch-project/opensearch";
import type { ProductRow } from "../db/schema.js";
import { PRODUCTS_ALIAS, productIndexBody, toSearchDocument } from "./productIndex.js";

/** Where the products come from; Postgres in the script, the same repo functions in tests. */
export interface ProductSource {
  rowsAfter(afterId: number, limit: number): Promise<ProductRow[]>;
  count(): Promise<number>;
}

export interface ReindexOptions {
  /** The alias search reads; versions are `<alias>_v<n>`. Tests pass their own so they never touch `products`. */
  alias?: string;
  batchSize?: number;
  /** Versions kept after the switch, the new one included, so the previous one is there to roll back to. */
  keep?: number;
}

export interface ReindexResult {
  index: string;
  count: number;
  deleted: string[];
}

/**
 * Builds `<alias>_v<n+1>` from the source, checks its document count, then moves the alias to it in one
 * atomic call, so search never sees a half-built index. Creates the first version (and the alias) when
 * there is none. On any failure the new index is deleted and the alias stays where it was.
 */
export async function reindex(
  client: Client,
  source: ProductSource,
  { alias = PRODUCTS_ALIAS, batchSize = 500, keep = 2 }: ReindexOptions = {},
): Promise<ReindexResult> {
  const existing = await listVersions(client, alias);
  const nextVersion = Math.max(0, ...existing.map((v) => v.version)) + 1;
  const index = `${alias}_v${nextVersion}`;

  await client.indices.create({ index, body: productIndexBody });
  try {
    const indexed = await indexAll(client, source, index, batchSize);
    await client.indices.refresh({ index });
    const [{ body }, expected] = await Promise.all([client.count({ index }), source.count()]);
    // A difference means documents were rejected or products changed mid-run; either way don't switch.
    if (body.count !== expected) {
      throw new Error(`${index} has ${body.count} documents but Postgres has ${expected} products`);
    }

    await client.indices.updateAliases({
      body: {
        actions: [
          ...existing.filter((v) => v.hasAlias).map((v) => ({ remove: { index: v.index, alias } })),
          { add: { index, alias } },
        ],
      },
    });
    return { index, count: indexed, deleted: await deleteOldVersions(client, existing, keep - 1) };
  } catch (error) {
    await client.indices.delete({ index });
    throw error;
  }
}

interface Version {
  index: string;
  version: number;
  hasAlias: boolean;
}

async function listVersions(client: Client, alias: string): Promise<Version[]> {
  const { body } = await client.indices.get({ index: `${alias}_v*` });
  const pattern = new RegExp(`^${alias}_v(\\d+)$`);
  return Object.entries(body).flatMap(([index, state]) => {
    const match = pattern.exec(index);
    if (!match) return [];
    return [{ index, version: Number(match[1]), hasAlias: alias in (state.aliases ?? {}) }];
  });
}

async function indexAll(
  client: Client,
  source: ProductSource,
  index: string,
  batchSize: number,
): Promise<number> {
  let indexed = 0;
  let afterId = 0;
  for (;;) {
    const rows = await source.rowsAfter(afterId, batchSize);
    if (rows.length === 0) return indexed;
    const body = rows.flatMap((row) => [
      { index: { _index: index, _id: String(row.id) } },
      toSearchDocument(row),
    ]);
    const { body: result } = await client.bulk({ body });
    if (result.errors) {
      const failed = result.items.filter((item) => item.index?.error);
      // Ids and error types only: product text never goes to the logs.
      const sample = failed
        .slice(0, 3)
        .map((item) => `${item.index?._id}: ${item.index?.error?.type}`)
        .join(", ");
      throw new Error(`${failed.length} documents were rejected (${sample})`);
    }
    indexed += rows.length;
    afterId = rows[rows.length - 1].id;
  }
}

/** Deletes versions older than the newest `keepPrevious` of the existing ones (the new one is kept anyway). */
async function deleteOldVersions(
  client: Client,
  existing: Version[],
  keepPrevious: number,
): Promise<string[]> {
  const old = [...existing]
    .sort((a, b) => b.version - a.version)
    .slice(Math.max(0, keepPrevious))
    .map((v) => v.index);
  if (old.length > 0) await client.indices.delete({ index: old.join(",") });
  return old;
}
