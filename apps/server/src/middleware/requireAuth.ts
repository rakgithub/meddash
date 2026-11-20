import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { verifySessionToken } from "../services/token.js";

export const SESSION_COOKIE = "session";

/** 401 unless the session cookie holds a valid token; stores the user id on res.locals.userId. */
export const requireAuth: RequestHandler = (req, res, next) => {
  // cookie-parser types req.cookies as any; narrow it before use.
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  const subject = typeof token === "string" ? verifySessionToken(token) : null;
  const userId = Number(subject);
  if (!subject || !Number.isSafeInteger(userId) || userId < 1) {
    return next(new AppError(401, "Not authenticated"));
  }
  res.locals.userId = userId;
  next();
};
