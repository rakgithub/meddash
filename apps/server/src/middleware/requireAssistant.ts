import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { anthropicClient } from "../services/assistant/anthropicClient.js";

/** 503 when no ANTHROPIC_API_KEY is set, so the rest of the app works without one. */
export const requireAssistant: RequestHandler = (_req, _res, next) => {
  next(anthropicClient ? undefined : new AppError(503, "Assistant is not configured"));
};
