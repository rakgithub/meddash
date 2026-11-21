import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { messagePartSchema, type AssistantMessageBody } from "../schemas/assistant.schema.js";
import { runTurn } from "../services/assistant/runTurn.js";

export const STREAM_ERROR_MESSAGE = "The assistant could not answer. Please try again.";

const event = (name: string | null, data: unknown) =>
  `${name ? `event: ${name}\n` : ""}data: ${JSON.stringify(data)}\n\n`;

/**
 * Streams the turn as Server-Sent Events: one `data:` event per MessagePart, then `event: done`.
 * Once the stream is open the status is already sent, so a failure becomes one `event: error`.
 */
export const sendMessage = asyncHandler(
  async (req: Request, res: Response<unknown, { body: AssistantMessageBody }>) => {
    let closed = false;
    res.on("close", () => {
      closed = true;
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
      for await (const part of runTurn(res.locals.body)) {
        if (closed) return;
        // Checking each part keeps the stream to the documented contract.
        res.write(event(null, messagePartSchema.parse(part)));
      }
      res.write(event("done", {}));
    } catch (err) {
      // Logs the error only; it never contains the request body (health data).
      console.error(err);
      if (!closed) res.write(event("error", { message: STREAM_ERROR_MESSAGE }));
    } finally {
      res.end();
    }
  },
);
