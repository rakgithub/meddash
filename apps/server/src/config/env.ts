import { z } from "zod";
import { emptyToUndefined } from "../schemas/emptyToUndefined.js";

const envSchema = z
  .object({
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
        .string({
          required_error: "is required (copy apps/server/.env.example to apps/server/.env)",
        })
        .min(32, "must be at least 32 characters (e.g. `openssl rand -hex 32`)"),
    ),
    NODE_ENV: z.preprocess(
      emptyToUndefined,
      z.enum(["development", "test", "production"]).default("development"),
    ),
    // Optional so the app runs without a key; the assistant endpoint answers 503 instead.
    ANTHROPIC_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
    ASSISTANT_MODEL: z.preprocess(emptyToUndefined, z.string().default("claude-haiku-5-5")),
    // Optional: without OPENSEARCH_URL, search runs on Postgres. Hosted OpenSearch always needs auth,
    // so a URL without credentials is a mistake, not a choice.
    OPENSEARCH_URL: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .regex(/^https?:\/\/[^@\s]+$/, "must be an http(s):// URL without credentials in it")
        .optional(),
    ),
    OPENSEARCH_USERNAME: z.preprocess(emptyToUndefined, z.string().optional()),
    OPENSEARCH_PASSWORD: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .superRefine((env, ctx) => {
    if (env.OPENSEARCH_URL === undefined) return;
    for (const key of ["OPENSEARCH_USERNAME", "OPENSEARCH_PASSWORD"] as const) {
      if (env[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "is required when OPENSEARCH_URL is set",
        });
      }
    }
  });

export type OpenSearchConfig = { url: string; username: string; password: string };

export type Config = {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  isProduction: boolean;
  anthropicApiKey: string | undefined;
  assistantModel: string;
  /** Undefined when OpenSearch isn't configured; search then uses Postgres. */
  opensearch: OpenSearchConfig | undefined;
};

/**
 * Validates the environment once at startup. The error lists only variable names and
 * reasons, never values: DATABASE_URL contains the password, and JWT_SECRET,
 * ANTHROPIC_API_KEY and OPENSEARCH_PASSWORD are secrets.
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
    anthropicApiKey: result.data.ANTHROPIC_API_KEY,
    assistantModel: result.data.ASSISTANT_MODEL,
    opensearch: toOpenSearchConfig(result.data),
  };
}

function toOpenSearchConfig(env: z.infer<typeof envSchema>): OpenSearchConfig | undefined {
  const { OPENSEARCH_URL: url, OPENSEARCH_USERNAME: username, OPENSEARCH_PASSWORD: password } = env;
  // The schema already requires both credentials with a URL; this narrows the types.
  if (url === undefined || username === undefined || password === undefined) return undefined;
  return { url, username, password };
}

export const config = parseEnv(process.env);
