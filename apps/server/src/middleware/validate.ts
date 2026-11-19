import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";
import { AppError } from "../errors/AppError.js";

const validate =
  (source: "query" | "params", message: string) =>
  (schema: ZodTypeAny): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || undefined,
        message: issue.message,
      }));
      return next(new AppError(400, message, details));
    }
    res.locals[source] = result.data;
    next();
  };

/**
 * Validates req.query against a Zod schema and stores the parsed, typed
 * result on res.locals.query (Express 4's req.query shouldn't be reassigned).
 */
export const validateQuery = validate("query", "Invalid query parameters");

/** Same for path params, stored on res.locals.params. */
export const validateParams = validate("params", "Invalid path parameters");
