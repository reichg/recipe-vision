import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetEnvCache } from "@/server/config/env";
import { AppError } from "@/server/shared/errors";

import {
  assertValidImageFile,
  getImageFilesFromFormData,
  s3ObjectKeySchema,
} from "./s3-validation";

const originalMaxUploadImageSizeBytes = process.env.MAX_UPLOAD_IMAGE_SIZE_BYTES;

describe("s3 validation", () => {
  beforeEach(() => {
    process.env.MAX_UPLOAD_IMAGE_SIZE_BYTES = "10";
    resetEnvCache();
  });

  afterEach(() => {
    if (originalMaxUploadImageSizeBytes === undefined) {
      delete process.env.MAX_UPLOAD_IMAGE_SIZE_BYTES;
    } else {
      process.env.MAX_UPLOAD_IMAGE_SIZE_BYTES = originalMaxUploadImageSizeBytes;
    }

    resetEnvCache();
  });

  it("accepts supported image uploads within the configured size limit", () => {
    expect(() =>
      assertValidImageFile(
        new File([new Uint8Array(10)], "recipe.jpg", { type: "image/jpeg" }),
      ),
    ).not.toThrow();
  });

  it("rejects unsupported upload types", () => {
    try {
      assertValidImageFile(
        new File(["recipe"], "recipe.txt", { type: "text/plain" }),
      );
      throw new Error("Expected assertValidImageFile to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);

      if (error instanceof AppError) {
        expect(error.code).toBe("UNSUPPORTED_IMAGE_TYPE");
        expect(error.statusCode).toBe(400);
      }
    }
  });

  it("rejects uploads larger than the configured limit", () => {
    try {
      assertValidImageFile(
        new File([new Uint8Array(11)], "recipe.jpg", { type: "image/jpeg" }),
      );
      throw new Error("Expected assertValidImageFile to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);

      if (error instanceof AppError) {
        expect(error.code).toBe("UPLOAD_TOO_LARGE");
        expect(error.statusCode).toBe(400);
      }
    }
  });

  it("rejects unsafe object keys", () => {
    expect(() => s3ObjectKeySchema.parse("../secrets/recipe.jpg")).toThrow(
      "Invalid object key",
    );
  });

  it("extracts repeated image fields from multipart form data in order", () => {
    const formData = new FormData();
    const firstFile = new File([new Uint8Array([1])], "recipe-1.jpg", {
      type: "image/jpeg",
    });
    const secondFile = new File([new Uint8Array([2])], "recipe-2.jpg", {
      type: "image/jpeg",
    });

    formData.append("images", firstFile);
    formData.append("images", secondFile);

    expect(getImageFilesFromFormData(formData)).toEqual([
      firstFile,
      secondFile,
    ]);
  });

  it("accepts the legacy single image field name", () => {
    const formData = new FormData();
    const file = new File([new Uint8Array([1])], "recipe.jpg", {
      type: "image/jpeg",
    });

    formData.append("image", file);

    expect(getImageFilesFromFormData(formData)).toEqual([file]);
  });
});
