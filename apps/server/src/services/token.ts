import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const ALGORITHM = "HS256";

export function signSessionToken(userId: string, secret = config.jwtSecret): string {
  return jwt.sign({}, secret, {
    algorithm: ALGORITHM,
    subject: userId,
    expiresIn: SESSION_MAX_AGE_MS / 1000,
  });
}

/** The user id from a valid token, or null when it is missing, expired, forged or malformed. */
export function verifySessionToken(token: string, secret = config.jwtSecret): string | null {
  try {
    // Pinning the algorithm stops a token from choosing a weaker one (e.g. "none").
    const payload = jwt.verify(token, secret, { algorithms: [ALGORITHM] });
    if (typeof payload === "string" || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) return null; // also covers TokenExpiredError
    throw err;
  }
}
