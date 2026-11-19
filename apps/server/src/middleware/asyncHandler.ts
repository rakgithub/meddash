import type { NextFunction } from "express";

/** Express 4 ignores rejected promises; forward them to the error handler instead. */
export const asyncHandler =
  <Req, Res>(fn: (req: Req, res: Res, next: NextFunction) => Promise<unknown>) =>
  (req: Req, res: Res, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
