import { describe, expect, it } from "vitest";

import { AppError } from "@/server/shared/errors";

import { parseDatabaseEnv, parseS3Env } from "./env";

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
