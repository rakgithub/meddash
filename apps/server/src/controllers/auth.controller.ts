import type { CookieOptions, Request, Response } from "express";
import { config } from "../config/env.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { SESSION_COOKIE } from "../middleware/requireAuth.js";
import type { LoginBody, RegisterBody, User } from "../schemas/auth.schema.js";
import { getCurrentUser, loginUser, registerUser } from "../services/auth.service.js";
import { SESSION_MAX_AGE_MS, signSessionToken } from "../services/token.js";

// httpOnly keeps the token away from page scripts; Lax blocks it on cross-site POSTs.
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: "lax",
  path: "/",
};

function startSession(res: Response, user: User) {
  res.cookie(SESSION_COOKIE, signSessionToken(user.id), {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE_MS,
  });
}

export const register = asyncHandler(
  async (_req: Request, res: Response<User, { body: RegisterBody }>) => {
    const user = await registerUser(res.locals.body);
    startSession(res, user);
    res.status(201).json(user);
  },
);

export const login = asyncHandler(
  async (_req: Request, res: Response<User, { body: LoginBody }>) => {
    const user = await loginUser(res.locals.body);
    startSession(res, user);
    res.json(user);
  },
);

export function logout(_req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
  res.status(204).end();
}

export const me = asyncHandler(async (_req: Request, res: Response<User, { userId: number }>) => {
  res.json(await getCurrentUser(res.locals.userId));
});
