import { z } from "zod";
import "../openapi/extend.js";

// Lower-cased so "Ana@x.de" and "ana@x.de" are the same account.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("Enter a valid email address")
  .openapi({ example: "ana@example.com" });

// Not trimmed: spaces are legitimate password characters. The cap bounds hashing work.
const PASSWORD_MAX = 128;

export const PASSWORD_MIN = 8;

export const registerBodySchema = z
  .object({
    email,
    password: z
      .string()
      .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
      .max(PASSWORD_MAX)
      .openapi({ example: "correct horse battery" }),
    name: z.string().trim().min(1, "Name is required").max(100).openapi({ example: "Ana Weber" }),
  })
  .strict();

// Login does not re-check the length rules: they may change after an account was created.
export const loginBodySchema = z
  .object({
    email,
    password: z.string().min(1, "Password is required").max(PASSWORD_MAX),
  })
  .strict();

export const userSchema = z
  .object({
    id: z.string().openapi({ example: "1" }),
    email: z.string().openapi({ example: "ana@example.com" }),
    name: z.string().openapi({ example: "Ana Weber" }),
    role: z.enum(["customer", "admin"]),
  })
  .openapi("User");

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type User = z.infer<typeof userSchema>;
