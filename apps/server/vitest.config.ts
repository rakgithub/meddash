import { defineConfig } from "vitest/config";

// Tests use their own database (created by docker/postgres/init.sql), never the dev one.
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgres://meddash:meddash@localhost:5433/meddash_test";

export default defineConfig({
  test: {
    // A fixed test-only signing key; real ones come from apps/server/.env.
    env: { DATABASE_URL: testDatabaseUrl, JWT_SECRET: "test-only-jwt-secret-not-for-real-use" },
    globalSetup: ["./src/test/global-setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Entry points, seed data and test infrastructure, not app code.
      exclude: [
        "src/**/*.test.ts",
        "src/index.ts",
        "src/db/migrate.ts",
        "src/db/seed.ts",
        "src/db/seed-data.ts",
        "src/test/**",
      ],
      reporter: ["text-summary", "lcov"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 75 },
    },
  },
});
