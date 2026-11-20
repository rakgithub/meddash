import { defineConfig, devices } from "@playwright/test";

const WEB_URL = "http://localhost:5173";
export const API_URL = "http://localhost:3001";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Start the real API and the Vite dev server (or reuse ones already running locally).
  webServer: [
    {
      command: "pnpm --dir ../server dev",
      url: `${API_URL}/products`,
      // A test-only signing key, so e2e (and CI) don't need apps/server/.env to define one.
      env: { JWT_SECRET: process.env.JWT_SECRET ?? "e2e-only-jwt-secret-not-for-real-use" },
      reuseExistingServer: !process.env.CI,
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
