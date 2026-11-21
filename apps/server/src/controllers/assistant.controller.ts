import type Anthropic from "@anthropic-ai/sdk";
import type { Request, Response } from "express";
import { config } from "../config/env.js";
import { findProductById, searchCatalogue } from "../db/products.repo.js";
import { AppError } from "../errors/AppError.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  compareEventSchema,
  messagePartSchema,
  type AssistantCompareBody,
  type AssistantMessageBody,
} from "../schemas/assistant.schema.js";
import { anthropicClient } from "../services/assistant/anthropicClient.js";
import { runCompare } from "../services/assistant/compare.js";
import {
  logCompareToStdout,
  logTurnToStdout,
  runTurn,
  type StreamModel,
} from "../services/assistant/runTurn.js";

export const STREAM_ERROR_MESSAGE = "The assistant could not answer. Please try again.";

const event = (name: string | null, data: unknown) =>
  `${name ? `event: ${name}\n` : ""}data: ${JSON.stringify(data)}\n\n`;

/** `requireAssistant` already answered 503; this narrows the type before a stream opens. */
function modelStream(): StreamModel {
  const client: Anthropic | null = anthropicClient;
  if (!client) throw new AppError(503, "Assistant is not configured");
  return (params, signal) => client.messages.stream(params, { signal });
}

/**
 * Streams events as Server-Sent Events: one `data:` event each, checked against `schema` so the
 * stream keeps to the documented contract, then `event: done`. Once the stream is open the status
 * is already sent, so a failure becomes one `event: error`. A closed connection (the user pressed
 * Stop or left) aborts `signal`, which cancels the model request.
 */
async function streamSse(
  res: Response,
  schema: { parse: (data: unknown) => unknown },
  events: (signal: AbortSignal) => AsyncIterable<unknown>,
): Promise<void> {
  const abort = new AbortController();
  let closed = false;
  res.on("close", () => {
    closed = true;
    abort.abort();
  });

  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    // Stops proxies such as nginx from buffering the stream.
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  try {
    for await (const data of events(abort.signal)) {
      if (closed) return;
      res.write(event(null, schema.parse(data)));
    }
    res.write(event("done", {}));
  } catch (err) {
    // After a disconnect the error is our own abort; there is no one to tell.
    if (closed) return;
    // Logs the error only; it never contains the request body (health data).
    console.error(err);
    res.write(event("error", { message: STREAM_ERROR_MESSAGE }));
  } finally {
    res.end();
  }
}

export const sendMessage = asyncHandler(
  async (_req: Request, res: Response<unknown, { body: AssistantMessageBody }>) => {
    const stream = modelStream();
    await streamSse(res, messagePartSchema, (signal) =>
      runTurn(res.locals.body, {
        stream,
        model: config.assistantModel,
        signal,
        searchCatalogue,
        findProductById,
        logTurn: logTurnToStdout,
      }),
    );
  },
);

/** A question about a shortlist. The products are loaded here, so an unknown id is a 404 before the stream opens. */
export const compare = asyncHandler(
  async (_req: Request, res: Response<unknown, { body: AssistantCompareBody }>) => {
    const stream = modelStream();
    const { productIds, question } = res.locals.body;
    const found = await Promise.all(productIds.map((id) => findProductById(Number(id))));
    const products = found.filter((p) => p !== null);
    if (products.length !== productIds.length) throw new AppError(404, "Product not found");

    await streamSse(res, compareEventSchema, (signal) =>
      runCompare({ question }, products, {
        stream,
        model: config.assistantModel,
        signal,
        logCompare: logCompareToStdout,
      }),
    );
  },
);
