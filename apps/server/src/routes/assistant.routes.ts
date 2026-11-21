import { Router } from "express";
import { sendMessage } from "../controllers/assistant.controller.js";
import { createRateLimiter } from "../middleware/rateLimit.js";
import { requireAssistant } from "../middleware/requireAssistant.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validateBody } from "../middleware/validate.js";
import { assistantMessageBodySchema } from "../schemas/assistant.schema.js";

const MINUTE = 60 * 1000;

export const ASSISTANT_RATE_LIMITS = [
  { max: 20, windowMs: 10 * MINUTE },
  { max: 200, windowMs: 24 * 60 * MINUTE },
];

export const assistantRouter = Router();

// Every turn costs money, so: signed in, configured, then rate limited before validation.
assistantRouter.post(
  "/messages",
  requireAuth,
  requireAssistant,
  createRateLimiter(ASSISTANT_RATE_LIMITS),
  validateBody(assistantMessageBodySchema),
  sendMessage,
);
