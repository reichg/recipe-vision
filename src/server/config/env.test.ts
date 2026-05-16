import { describe, expect, it } from "vitest";

import { AppError } from "@/server/shared/errors";

import { parseAiEnv, parseDatabaseEnv, parseS3Env } from "./env";

describe("env", () => {
  it("parses database configuration", () => {
    expect(
      parseDatabaseEnv({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://user:password@localhost:5432/recipes",
      }),
    ).toEqual({
      DATABASE_URL: "postgresql://user:password@localhost:5432/recipes",
    });
  });

  it("applies S3 defaults", () => {
    expect(
      parseS3Env({
        NODE_ENV: "test",
        MAX_UPLOAD_IMAGE_SIZE_BYTES: "2048",
        AWS_REGION: "us-east-1",
        AWS_ACCESS_KEY_ID: "access-key",
        AWS_SECRET_ACCESS_KEY: "secret-key",
        AWS_S3_BUCKET: "recipe-images",
      }),
    ).toEqual({
      MAX_UPLOAD_IMAGE_SIZE_BYTES: 2048,
      AWS_REGION: "us-east-1",
      AWS_ACCESS_KEY_ID: "access-key",
      AWS_SECRET_ACCESS_KEY: "secret-key",
      AWS_S3_BUCKET: "recipe-images",
      S3_PROCESSED_PREFIX: "images/processed/",
      S3_SIGNED_URL_TTL_SECONDS: 3600,
      S3_UNPROCESSED_PREFIX: "images/un-processed/",
    });
  });

  it("parses AI defaults and expands the Gemini model rotation list", () => {
    expect(
      parseAiEnv({
        NODE_ENV: "test",
        GEMINI_API_KEY: "gemini-key",
        GEMINI_MODEL: "gemini-2.5-flash-lite",
        OCRSPACE_API_KEY: "ocr-key",
      }),
    ).toEqual({
      MAX_UPLOAD_IMAGE_SIZE_BYTES: 1024 * 1024,
      GEMINI_API_KEY: "gemini-key",
      GEMINI_MODEL: "gemini-2.5-flash-lite",
      GEMINI_MODELS: ["gemini-2.5-flash-lite"],
      GEMINI_TIMEOUT_MS: 30_000,
      MISTRAL_API_KEY: undefined,
      MISTRAL_MODELS: [
        "mistral-small-latest",
        "ministral-8b-latest",
        "open-mistral-nemo",
      ],
      GROQ_API_KEY: undefined,
      GROQ_MODELS: [
        "llama-3.3-70b-versatile",
        "qwen/qwen3-32b",
        "llama-3.1-8b-instant",
      ],
      OPENROUTER_API_KEY: undefined,
      OPENROUTER_MODELS: [
        "google/gemma-3-27b-it:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "mistralai/mistral-small-3.1-24b-instruct:free",
      ],
      CEREBRAS_API_KEY: undefined,
      CEREBRAS_MODELS: ["qwen-3-32b", "llama-3.3-70b"],
      LLM_MODEL_CANDIDATES: [
        {
          provider: "gemini",
          model: "gemini-2.5-flash-lite",
        },
      ],
      OCR_MAX_FILE_SIZE_BYTES: 1024 * 1024,
      OCRSPACE_API_KEY: "ocr-key",
      OCRSPACE_DAILY_LIMIT: 500,
      OCRSPACE_HOURLY_LIMIT: 180,
      OCR_TIMEOUT_MS: 30_000,
    });
  });

  it("deduplicates and trims fallback Gemini models", () => {
    expect(
      parseAiEnv({
        NODE_ENV: "test",
        GEMINI_API_KEY: "gemini-key",
        GEMINI_MODEL: "gemini-2.5-flash-lite",
        GEMINI_FALLBACK_MODELS:
          " gemini-2.5-flash , gemini-2.5-flash-lite , gemini-2.5-flash ",
        OCRSPACE_API_KEY: "ocr-key",
      }).GEMINI_MODELS,
    ).toEqual(["gemini-2.5-flash-lite", "gemini-2.5-flash"]);
  });

  it("builds a cross-provider model roster from configured provider sections", () => {
    expect(
      parseAiEnv({
        NODE_ENV: "test",
        GEMINI_API_KEY: "gemini-key",
        GEMINI_MODEL: "gemini-2.5-flash-lite",
        GEMINI_FALLBACK_MODELS: "gemini-2.5-flash",
        MISTRAL_API_KEY: "mistral-key",
        MISTRAL_MODELS: "mistral-small-latest",
        GROQ_API_KEY: "groq-key",
        GROQ_MODELS: "llama-3.3-70b-versatile,qwen/qwen3-32b",
        OPENROUTER_API_KEY: "openrouter-key",
        OPENROUTER_MODELS: "google/gemma-3-27b-it:free",
        CEREBRAS_API_KEY: "cerebras-key",
        CEREBRAS_MODELS: "qwen-3-32b",
        OCRSPACE_API_KEY: "ocr-key",
      }).LLM_MODEL_CANDIDATES,
    ).toEqual([
      { provider: "gemini", model: "gemini-2.5-flash-lite" },
      { provider: "gemini", model: "gemini-2.5-flash" },
      { provider: "mistral", model: "mistral-small-latest" },
      { provider: "groq", model: "llama-3.3-70b-versatile" },
      { provider: "groq", model: "qwen/qwen3-32b" },
      { provider: "openrouter", model: "google/gemma-3-27b-it:free" },
      { provider: "cerebras", model: "qwen-3-32b" },
    ]);
  });

  it("throws an app error when database configuration is missing", () => {
    try {
      parseDatabaseEnv({ NODE_ENV: "test" });
      throw new Error("Expected parseDatabaseEnv to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);

      if (error instanceof AppError) {
        expect(error.code).toBe("DATABASE_ENV_INVALID");
        expect(error.statusCode).toBe(500);
        expect(error.message).toBe("Service is not configured");
      }
    }
  });
});
