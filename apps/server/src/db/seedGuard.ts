const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

/**
 * Seeding deletes every product, so it only runs against a local database unless the caller
 * opts in with ALLOW_REMOTE_SEED=1 (for a hosted database that has no real data yet).
 * Returns why seeding must not run, or undefined when it may.
 */
export function seedRefusal(
  env: { NODE_ENV?: string; ALLOW_REMOTE_SEED?: string },
  databaseUrl: string,
): string | undefined {
  if (env.NODE_ENV === "production") return "NODE_ENV=production";

  const host = new URL(databaseUrl).hostname;
  if (LOCAL_HOSTS.includes(host) || env.ALLOW_REMOTE_SEED === "1") return undefined;
  return `database host "${host}" is not local (set ALLOW_REMOTE_SEED=1 to seed it anyway)`;
}
