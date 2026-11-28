import { defineConfig, devices } from "@playwright/test";

const WEB_URL = "http://localhost:5173";
export const API_URL = "http://localhost:3001";

// The API under test uses the test database (created by docker/postgres/init.sql), never the
// dev one, so e2e always sees the seed data. Env vars set here win over apps/server/.env.
export const API_ENV = {
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ?? "postgres://meddash:meddash@localhost:5433/meddash_test",
  // A test-only signing key, so e2e (and CI) don't need apps/server/.env to define one.
  JWT_SECRET: process.env.JWT_SECRET ?? "e2e-only-jwt-secret-not-for-real-use",
};

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Start the real API and the Vite dev server (Vite may be reused locally).
  webServer: [
    {
      command: "pnpm --dir ../server dev",
      url: `${API_URL}/products`,
      env: API_ENV,
      // Never reuse an API on :3001: a running `pnpm dev` reads the dev database. Stop it first.
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "pnpm dev",
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
