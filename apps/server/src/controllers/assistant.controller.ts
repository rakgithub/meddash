import type { Request, Response } from "express";
import { config } from "../config/env.js";
import { findProductById, searchCatalogue } from "../db/products.repo.js";
import { AppError } from "../errors/AppError.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { messagePartSchema, type AssistantMessageBody } from "../schemas/assistant.schema.js";
import { anthropicClient } from "../services/assistant/anthropicClient.js";
import { logTurnToStdout, runTurn } from "../services/assistant/runTurn.js";

export const STREAM_ERROR_MESSAGE = "The assistant could not answer. Please try again.";

const event = (name: string | null, data: unknown) =>
  `${name ? `event: ${name}\n` : ""}data: ${JSON.stringify(data)}\n\n`;

/**
 * Streams the turn as Server-Sent Events: one `data:` event per MessagePart, then `event: done`.
 * Once the stream is open the status is already sent, so a failure becomes one `event: error`.
 */
export const sendMessage = asyncHandler(
  async (req: Request, res: Response<unknown, { body: AssistantMessageBody }>) => {
    // `requireAssistant` already answered 503; this narrows the type before the stream opens.
    const client = anthropicClient;
    if (!client) throw new AppError(503, "Assistant is not configured");

    // A closed connection (the user pressed Stop or left) cancels the model request.
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
      const parts = runTurn(res.locals.body, {
        stream: (params, signal) => client.messages.stream(params, { signal }),
        model: config.assistantModel,
        signal: abort.signal,
        searchCatalogue,
        findProductById,
        logTurn: logTurnToStdout,
      });
      for await (const part of parts) {
        if (closed) return;
        // Checking each part keeps the stream to the documented contract.
        res.write(event(null, messagePartSchema.parse(part)));
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
  },
);
