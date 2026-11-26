import { allImageUrls } from "./images.js";

// Run by hand (`pnpm catalogue:check-images`), not in CI: it needs the network.
const urls = allImageUrls();
const dead: string[] = [];

for (const url of urls) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) dead.push(`${response.status} ${url}`);
  } catch (error) {
    dead.push(`${error instanceof Error ? error.message : "failed"} ${url}`);
  }
}

if (dead.length === 0) {
  process.stdout.write(`All ${urls.length} image URLs respond.\n`);
} else {
  console.error(`${dead.length} of ${urls.length} image URLs are dead:`);
  for (const line of dead) console.error(`  ${line}`);
  process.exitCode = 1;
}
