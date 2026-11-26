import { parseArgs } from "node:util";
import { config } from "../../config/env.js";
import { pool } from "../client.js";
import { findExistingSkus, upsertProductsBySku } from "./catalogue.repo.js";
import { generateCatalogue } from "./generate.js";
import { loadRefusal } from "./hostGuard.js";
import { validateCatalogue } from "./validate.js";

const BATCH_SIZE = 500;

const out = (line: string) => process.stdout.write(`${line}\n`);

const { values } = parseArgs({
  options: { "dry-run": { type: "boolean" }, "confirm-host": { type: "string" } },
});

const refusal = loadRefusal(config.databaseUrl, values["confirm-host"]);
if (refusal) {
  console.error(`Refusing to load: ${refusal}.`);
  process.exit(1);
}

const rows = generateCatalogue();
const problems = validateCatalogue(rows);
if (problems.length > 0) {
  console.error(`${problems.length} generated products are invalid; nothing was written:`);
  for (const problem of problems.slice(0, 20)) console.error(`  ${problem}`);
  process.exit(1);
}

const byCategory = new Map<string, number>();
for (const row of rows) byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + 1);
out(`Generated ${rows.length} products:`);
for (const [category, n] of [...byCategory].sort()) out(`  ${category.padEnd(14)} ${n}`);

try {
  if (values["dry-run"]) {
    const existing = await findExistingSkus(rows.map((r) => r.sku));
    out(
      `Dry run, nothing written: ${rows.length - existing.size} would be inserted, ${existing.size} updated.`,
    );
  } else {
    let inserted = 0;
    let updated = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const result = await upsertProductsBySku(rows.slice(i, i + BATCH_SIZE));
      inserted += result.inserted;
      updated += result.updated;
      out(`  ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}`);
    }
    out(`Done: ${inserted} inserted, ${updated} updated.`);
  }
} finally {
  await pool.end();
}
