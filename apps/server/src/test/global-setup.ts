import { execFileSync } from "node:child_process";
import type { GlobalSetupContext } from "vitest/node";

// Migrate and seed the test database once per run, through the same scripts as `pnpm db:*`.
// Tests share this seed; auth tests add users with unique emails and never change products.
export default function setup({ config }: GlobalSetupContext) {
  // The scripts load config/env.ts, so they need every test variable (DATABASE_URL, JWT_SECRET).
  const env = { ...process.env, ...config.env };
  for (const script of ["src/db/migrate.ts", "src/db/seed.ts"]) {
    execFileSync(process.execPath, ["--import", "tsx", script], { env, stdio: "inherit" });
  }
}
