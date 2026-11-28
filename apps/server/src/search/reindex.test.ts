import { afterAll, describe, expect, it } from "vitest";
import { countProducts, findProductRowsAfter } from "../db/products.repo.js";
import { createSearchClient } from "./client.js";
import { reindex, type ProductSource } from "./reindex.js";

// Runs against the OpenSearch container (docker compose locally, a service container in CI).
// A unique alias per run, so it never touches the dev `products` index in the same container.
const client = createSearchClient(
  {
    url: process.env.TEST_OPENSEARCH_URL ?? "http://localhost:9200",
    username: process.env.TEST_OPENSEARCH_USERNAME ?? "admin",
    password: process.env.TEST_OPENSEARCH_PASSWORD ?? "MedDash-local-search-1!",
  },
  { requestTimeoutMs: 30_000 },
);
const alias = `test_products_${process.pid}_${Date.now()}`;
const postgres: ProductSource = { rowsAfter: findProductRowsAfter, count: countProducts };
// Small batches so the seed takes several bulk requests.
const options = { alias, batchSize: 7 };

async function aliasTargets(): Promise<string[]> {
  const { body } = await client.indices.getAlias({ name: alias });
  return Object.keys(body);
}

async function versions(): Promise<string[]> {
  const { body } = await client.indices.get({ index: `${alias}_v*` });
  return Object.keys(body).sort();
}

afterAll(async () => {
  await client.indices.delete({ index: `${alias}_v*` });
  await client.close();
});

describe("reindex", () => {
  it("creates the first version from Postgres and points the alias at it", async () => {
    const result = await reindex(client, postgres, options);

    expect(result).toEqual({ index: `${alias}_v1`, count: await countProducts(), deleted: [] });
    expect(await aliasTargets()).toEqual([`${alias}_v1`]);
    const { body } = await client.count({ index: alias });
    expect(body.count).toBe(await countProducts());
  });

  it("applies synonyms at search time only", async () => {
    const analyze = async (analyzer: string) => {
      const { body } = await client.indices.analyze({
        index: `${alias}_v1`,
        body: { analyzer, text: "acetaminophen" },
      });
      return body.tokens?.map((t) => t.token);
    };
    expect(await analyze("en_search")).toContain("paracetamol");
    expect(await analyze("en_index")).not.toContain("paracetamol");
  });

  it("moves the alias to each new version and keeps only the last two", async () => {
    expect((await reindex(client, postgres, options)).deleted).toEqual([]);
    const third = await reindex(client, postgres, options);

    expect(third.deleted).toEqual([`${alias}_v1`]);
    expect(await aliasTargets()).toEqual([`${alias}_v3`]);
    expect(await versions()).toEqual([`${alias}_v2`, `${alias}_v3`]);
  });

  it("leaves the alias alone and removes the new index when the count doesn't match", async () => {
    const drifted: ProductSource = { ...postgres, count: async () => (await countProducts()) + 1 };

    await expect(reindex(client, drifted, options)).rejects.toThrow(
      /_v4 has \d+ documents but Postgres has \d+ products/,
    );
    expect(await aliasTargets()).toEqual([`${alias}_v3`]);
    expect(await versions()).toEqual([`${alias}_v2`, `${alias}_v3`]);
  });
});
