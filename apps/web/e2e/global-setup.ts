import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { API_ENV } from "../playwright.config";

const serverDir = fileURLToPath(new URL("../../server", import.meta.url));

// Reset the e2e database to the known seed before every run, through the same scripts as
// `pnpm db:*`. Never the dev database: that one may hold the 1,000-product demo catalogue.
export default function globalSetup() {
  const env = { ...process.env, ...API_ENV };
  for (const script of ["db:migrate", "db:seed"]) {
    execFileSync("pnpm", ["--dir", serverDir, script], { env, stdio: "inherit" });
  }
}
