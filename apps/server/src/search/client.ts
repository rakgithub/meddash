import { Client } from "@opensearch-project/opensearch";
import type { OpenSearchConfig } from "../config/env.js";

/** Search requests must fail fast so the caller can fall back to Postgres (plan PR 3). */
export const SEARCH_REQUEST_TIMEOUT_MS = 800;

export interface ClientOptions {
  /** Defaults to the search timeout; bulk work such as a reindex needs longer. */
  requestTimeoutMs?: number;
  /** Retries on connection errors and timeouts. Search uses none: a fallback is faster than a retry. */
  maxRetries?: number;
}

export function createSearchClient(config: OpenSearchConfig, options: ClientOptions = {}): Client {
  return new Client({
    node: config.url,
    auth: { username: config.username, password: config.password },
    requestTimeout: options.requestTimeoutMs ?? SEARCH_REQUEST_TIMEOUT_MS,
    maxRetries: options.maxRetries ?? 0,
    // Reuse sockets between requests; a new TLS handshake per search would eat most of the timeout.
    agent: { keepAlive: true },
  });
}
