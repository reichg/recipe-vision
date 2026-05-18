import { z } from "zod";

import { AppError } from "@/server/shared/errors";

const uploadEnvSchema = z.object({
  MAX_UPLOAD_IMAGE_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024),
});

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

function parseCommaSeparatedStrings(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  return trimmed === "" ? undefined : trimmed;
}

const optionalApiKeySchema = z.preprocess(
  normalizeOptionalString,
  z.string().min(1).optional(),
);

const aiEnvSchema = uploadEnvSchema.extend({
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-pro"),
  GEMINI_FALLBACK_MODELS: z.string().default(""),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  MISTRAL_API_KEY: optionalApiKeySchema,
  MISTRAL_MODELS: z
    .string()
    .default("mistral-small-latest,ministral-8b-latest,open-mistral-nemo"),
  GROQ_API_KEY: optionalApiKeySchema,
  GROQ_MODELS: z
    .string()
    .default("llama-3.3-70b-versatile,qwen/qwen3-32b,llama-3.1-8b-instant"),
  OPENROUTER_API_KEY: optionalApiKeySchema,
  OPENROUTER_MODELS: z
    .string()
    .default(
      "google/gemma-3-27b-it:free,meta-llama/llama-3.3-70b-instruct:free,mistralai/mistral-small-3.1-24b-instruct:free",
    ),
  CEREBRAS_API_KEY: optionalApiKeySchema,
  CEREBRAS_MODELS: z.string().default("qwen-3-32b,llama-3.3-70b"),
  OCR_MAX_FILE_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(1024 * 1024),
  OCRSPACE_API_KEY: z.string().min(1),
  OCRSPACE_DAILY_LIMIT: z.coerce.number().int().positive().default(500),
  OCRSPACE_HOURLY_LIMIT: z.coerce.number().int().positive().default(180),
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

export type LlmProviderName =
  | "gemini"
  | "mistral"
  | "groq"
  | "openrouter"
  | "cerebras";

export type LlmModelCandidate = {
  provider: LlmProviderName;
  model: string;
};

export type AiEnv = UploadEnv & {
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  GEMINI_MODELS: string[];
  GEMINI_TIMEOUT_MS: number;
  MISTRAL_API_KEY?: string;
  MISTRAL_MODELS: string[];
  GROQ_API_KEY?: string;
  GROQ_MODELS: string[];
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODELS: string[];
  CEREBRAS_API_KEY?: string;
  CEREBRAS_MODELS: string[];
  LLM_MODEL_CANDIDATES: LlmModelCandidate[];
  OCR_MAX_FILE_SIZE_BYTES: number;
  OCRSPACE_API_KEY: string;
  OCRSPACE_DAILY_LIMIT: number;
  OCRSPACE_HOURLY_LIMIT: number;
  OCR_TIMEOUT_MS: number;
};
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
  const parsed = parseEnv(aiEnvSchema, env, "AI_ENV_INVALID");
  const geminiModels = Array.from(
    new Set([
      parsed.GEMINI_MODEL,
      ...parseCommaSeparatedStrings(parsed.GEMINI_FALLBACK_MODELS),
    ]),
  );
  const mistralModels = parseCommaSeparatedStrings(parsed.MISTRAL_MODELS);
  const groqModels = parseCommaSeparatedStrings(parsed.GROQ_MODELS);
  const openRouterModels = parseCommaSeparatedStrings(parsed.OPENROUTER_MODELS);
  const cerebrasModels = parseCommaSeparatedStrings(parsed.CEREBRAS_MODELS);
  const llmModelCandidates: LlmModelCandidate[] = [
    ...geminiModels.map((model) => ({ provider: "gemini" as const, model })),
    ...(parsed.MISTRAL_API_KEY
      ? mistralModels.map((model) => ({ provider: "mistral" as const, model }))
      : []),
    ...(parsed.GROQ_API_KEY
      ? groqModels.map((model) => ({ provider: "groq" as const, model }))
      : []),
    ...(parsed.OPENROUTER_API_KEY
      ? openRouterModels.map((model) => ({
          provider: "openrouter" as const,
          model,
        }))
      : []),
    ...(parsed.CEREBRAS_API_KEY
      ? cerebrasModels.map((model) => ({
          provider: "cerebras" as const,
          model,
        }))
      : []),
  ];

  return {
    GEMINI_API_KEY: parsed.GEMINI_API_KEY,
    GEMINI_MODEL: parsed.GEMINI_MODEL,
    GEMINI_MODELS: geminiModels,
    GEMINI_TIMEOUT_MS: parsed.GEMINI_TIMEOUT_MS,
    MISTRAL_API_KEY: parsed.MISTRAL_API_KEY,
    MISTRAL_MODELS: mistralModels,
    GROQ_API_KEY: parsed.GROQ_API_KEY,
    GROQ_MODELS: groqModels,
    OPENROUTER_API_KEY: parsed.OPENROUTER_API_KEY,
    OPENROUTER_MODELS: openRouterModels,
    CEREBRAS_API_KEY: parsed.CEREBRAS_API_KEY,
    CEREBRAS_MODELS: cerebrasModels,
    LLM_MODEL_CANDIDATES: llmModelCandidates,
    MAX_UPLOAD_IMAGE_SIZE_BYTES: parsed.MAX_UPLOAD_IMAGE_SIZE_BYTES,
    OCR_MAX_FILE_SIZE_BYTES: parsed.OCR_MAX_FILE_SIZE_BYTES,
    OCRSPACE_API_KEY: parsed.OCRSPACE_API_KEY,
    OCRSPACE_DAILY_LIMIT: parsed.OCRSPACE_DAILY_LIMIT,
    OCRSPACE_HOURLY_LIMIT: parsed.OCRSPACE_HOURLY_LIMIT,
    OCR_TIMEOUT_MS: parsed.OCR_TIMEOUT_MS,
  };
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
