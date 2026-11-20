import { z } from "zod";
import { emptyToUndefined } from "../schemas/emptyToUndefined.js";

const envSchema = z.object({
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(65535).default(3001)),
  DATABASE_URL: z.preprocess(
    emptyToUndefined,
    z
      .string({
        required_error: "is required (copy apps/server/.env.example to apps/server/.env)",
      })
      .regex(/^postgres(ql)?:\/\/.+/, "must be a postgres:// connection URL"),
  ),
  // Signs session JWTs; anyone who knows it can forge a login, so require a long random value.
  JWT_SECRET: z.preprocess(
    emptyToUndefined,
    z
      .string({ required_error: "is required (copy apps/server/.env.example to apps/server/.env)" })
      .min(32, "must be at least 32 characters (e.g. `openssl rand -hex 32`)"),
  ),
  NODE_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(["development", "test", "production"]).default("development"),
  ),
});

export type Config = {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  isProduction: boolean;
};

/**
 * Validates the environment once at startup. The error lists only variable names and
 * reasons, never values: DATABASE_URL contains the password and JWT_SECRET is a secret.
 */
export function parseEnv(env: NodeJS.ProcessEnv): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  ${i.path.join(".")} ${i.message}`);
    throw new Error(`Invalid environment:\n${problems.join("\n")}`);
  }
  return {
    port: result.data.PORT,
    databaseUrl: result.data.DATABASE_URL,
    jwtSecret: result.data.JWT_SECRET,
    isProduction: result.data.NODE_ENV === "production",
  };
}

export const config = parseEnv(process.env);
