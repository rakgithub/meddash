import { execFileSync } from "node:child_process";
import type { GlobalSetupContext } from "vitest/node";

// Migrate and seed the test database once per run, through the same scripts as `pnpm db:*`.
// Tests only read, so they all share this seed.
export default function setup({ config }: GlobalSetupContext) {
  const env = { ...process.env, DATABASE_URL: config.env.DATABASE_URL };
  for (const script of ["src/db/migrate.ts", "src/db/seed.ts"]) {
    execFileSync(process.execPath, ["--import", "tsx", script], { env, stdio: "inherit" });
  }
}
