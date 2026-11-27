import { LOCAL_HOSTS } from "../seedGuard.js";

/**
 * The loader only adds and updates, but a hosted database is still shared, so it must be named on
 * the command line: `--confirm-host <hostname>` has to match the database URL's host.
 * Returns why loading must not run, or undefined when it may.
 */
export function loadRefusal(
  databaseUrl: string,
  confirmHost: string | undefined,
): string | undefined {
  const host = new URL(databaseUrl).hostname;
  if (LOCAL_HOSTS.includes(host)) return undefined;
  if (confirmHost === undefined) {
    return `database host "${host}" is not local (pass --confirm-host ${host} to load it)`;
  }
  if (confirmHost !== host) {
    return `--confirm-host "${confirmHost}" does not match the database host "${host}"`;
  }
  return undefined;
}
