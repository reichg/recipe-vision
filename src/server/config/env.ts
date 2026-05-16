import { z } from "zod";

import { AppError } from "@/server/shared/errors";

const uploadEnvSchema = z.object({
  MAX_UPLOAD_IMAGE_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(1024 * 1024),
});

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

const aiEnvSchema = uploadEnvSchema.extend({
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-pro"),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  OCRSPACE_API_KEY: z.string().min(1),
  OCR_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
});

const s3EnvSchema = uploadEnvSchema.extend({
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),
  S3_PROCESSED_PREFIX: z.string().min(1).default("images/processed/"),
  S3_SIGNED_URL_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .max(3600)
    .default(3600),
  S3_UNPROCESSED_PREFIX: z.string().min(1).default("images/un-processed/"),
});

function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  env: NodeJS.ProcessEnv,
  code: string,
): z.infer<T> {
  const result = schema.safeParse(env);

  if (!result.success) {
    throw new AppError({
      code,
      message: "Service is not configured",
      statusCode: 500,
      cause: result.error.flatten(),
    });
  }

  return result.data;
}

export type UploadEnv = z.infer<typeof uploadEnvSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type AiEnv = z.infer<typeof aiEnvSchema>;
export type S3Env = z.infer<typeof s3EnvSchema>;

let cachedUploadEnv: UploadEnv | undefined;
let cachedDatabaseEnv: DatabaseEnv | undefined;
let cachedAiEnv: AiEnv | undefined;
let cachedS3Env: S3Env | undefined;

export function parseUploadEnv(env: NodeJS.ProcessEnv): UploadEnv {
  return parseEnv(uploadEnvSchema, env, "UPLOAD_ENV_INVALID");
}

export function parseDatabaseEnv(env: NodeJS.ProcessEnv): DatabaseEnv {
  return parseEnv(databaseEnvSchema, env, "DATABASE_ENV_INVALID");
}

export function parseAiEnv(env: NodeJS.ProcessEnv): AiEnv {
  return parseEnv(aiEnvSchema, env, "AI_ENV_INVALID");
}

export function parseS3Env(env: NodeJS.ProcessEnv): S3Env {
  return parseEnv(s3EnvSchema, env, "S3_ENV_INVALID");
}

export function getUploadEnv(): UploadEnv {
  cachedUploadEnv ??= parseUploadEnv(process.env);
  return cachedUploadEnv;
}

export function getDatabaseEnv(): DatabaseEnv {
  cachedDatabaseEnv ??= parseDatabaseEnv(process.env);
  return cachedDatabaseEnv;
}

export function getAiEnv(): AiEnv {
  cachedAiEnv ??= parseAiEnv(process.env);
  return cachedAiEnv;
}

export function getS3Env(): S3Env {
  cachedS3Env ??= parseS3Env(process.env);
  return cachedS3Env;
}

export function resetEnvCache() {
  cachedUploadEnv = undefined;
  cachedDatabaseEnv = undefined;
  cachedAiEnv = undefined;
  cachedS3Env = undefined;
}
