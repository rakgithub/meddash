import { Router } from "express";
import { compare, sendMessage } from "../controllers/assistant.controller.js";
import { recordAssistantTurn } from "../db/assistantTurns.repo.js";
import { createRateLimiter } from "../middleware/rateLimit.js";
import { requireAssistant } from "../middleware/requireAssistant.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validateBody } from "../middleware/validate.js";
import {
  assistantCompareBodySchema,
  assistantMessageBodySchema,
} from "../schemas/assistant.schema.js";

const MINUTE = 60 * 1000;

export const ASSISTANT_RATE_LIMITS = [
  { max: 20, windowMs: 10 * MINUTE },
  { max: 200, windowMs: 24 * 60 * MINUTE },
];

export const assistantRouter = Router();

// Every turn costs money, so: signed in, configured, then rate limited. Only valid turns count,
// because only they reach the model; an invalid request is rejected before it is counted.
assistantRouter.post(
  "/messages",
  requireAuth,
  requireAssistant,
  validateBody(assistantMessageBodySchema),
  createRateLimiter(ASSISTANT_RATE_LIMITS, recordAssistantTurn),
  sendMessage,
);

// A compare question costs about as much as a turn, so it counts in the same window.
assistantRouter.post(
  "/compare",
  requireAuth,
  requireAssistant,
  validateBody(assistantCompareBodySchema),
  createRateLimiter(ASSISTANT_RATE_LIMITS, recordAssistantTurn),
  compare,
);
