import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MAX_UPLOAD_RECIPE_GROUPS } from "@/schemas/uploadGroupSchema";
import { resetEnvCache } from "@/server/config/env";
import { AppError } from "@/server/shared/errors";

import {
  assertValidImageFile,
  getImageFilesFromFormData,
  getImageUploadGroupsFromFormData,
  s3ObjectKeySchema,
} from "./s3-validation";

const LEGACY_OCR_UPLOAD_LIMIT_BYTES = 1024 * 1024;
const DEFAULT_UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024;

const originalMaxUploadImageSizeBytes = process.env.MAX_UPLOAD_IMAGE_SIZE_BYTES;

describe("s3 validation", () => {
  beforeEach(() => {
    process.env.MAX_UPLOAD_IMAGE_SIZE_BYTES = String(
      DEFAULT_UPLOAD_LIMIT_BYTES,
    );
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

  it("accepts uploads that are larger than the OCR provider cap", () => {
    expect(() =>
      assertValidImageFile(
        new File(
          [new Uint8Array(LEGACY_OCR_UPLOAD_LIMIT_BYTES + 1)],
          "recipe.jpg",
          { type: "image/jpeg" },
        ),
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
        new File(
          [new Uint8Array(DEFAULT_UPLOAD_LIMIT_BYTES + 1)],
          "recipe.jpg",
          { type: "image/jpeg" },
        ),
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

  it("groups uploaded images based on the upload manifest", () => {
    const formData = new FormData();
    const firstFile = new File([new Uint8Array([1])], "recipe-1.jpg", {
      type: "image/jpeg",
    });
    const secondFile = new File([new Uint8Array([2])], "recipe-1-b.jpg", {
      type: "image/jpeg",
    });
    const thirdFile = new File([new Uint8Array([3])], "recipe-2.jpg", {
      type: "image/jpeg",
    });

    formData.append("images", firstFile);
    formData.append("images", secondFile);
    formData.append("images", thirdFile);
    formData.append(
      "uploadGroups",
      JSON.stringify([
        { clientGroupId: "recipe-1", fileIndexes: [0, 1] },
        { clientGroupId: "recipe-2", fileIndexes: [2] },
      ]),
    );

    expect(getImageUploadGroupsFromFormData(formData)).toEqual({
      groups: [
        { clientGroupId: "recipe-1", files: [firstFile, secondFile] },
        { clientGroupId: "recipe-2", files: [thirdFile] },
      ],
      usedManifest: true,
    });
  });

  it("falls back to a single legacy upload group when no manifest is provided", () => {
    const formData = new FormData();
    const file = new File([new Uint8Array([1])], "recipe.jpg", {
      type: "image/jpeg",
    });

    formData.append("images", file);

    expect(getImageUploadGroupsFromFormData(formData)).toEqual({
      groups: [{ clientGroupId: "group-1", files: [file] }],
      usedManifest: false,
    });
  });

  it("rejects upload manifests that reference missing images", () => {
    const formData = new FormData();

    formData.append(
      "images",
      new File([new Uint8Array([1])], "recipe.jpg", {
        type: "image/jpeg",
      }),
    );
    formData.append(
      "uploadGroups",
      JSON.stringify([{ clientGroupId: "recipe-1", fileIndexes: [1] }]),
    );

    expect(() => getImageUploadGroupsFromFormData(formData)).toThrow(
      "Upload group references a missing image",
    );
  });

  it("rejects upload manifests that leave files ungrouped", () => {
    const formData = new FormData();

    formData.append(
      "images",
      new File([new Uint8Array([1])], "recipe-1.jpg", {
        type: "image/jpeg",
      }),
    );
    formData.append(
      "images",
      new File([new Uint8Array([2])], "recipe-2.jpg", {
        type: "image/jpeg",
      }),
    );
    formData.append(
      "uploadGroups",
      JSON.stringify([{ clientGroupId: "recipe-1", fileIndexes: [0] }]),
    );

    expect(() => getImageUploadGroupsFromFormData(formData)).toThrow(
      "Every uploaded image must belong to a recipe group",
    );
  });

  it("rejects upload manifests that exceed the recipe-group limit", () => {
    const formData = new FormData();

    for (let index = 0; index <= MAX_UPLOAD_RECIPE_GROUPS; index += 1) {
      formData.append(
        "images",
        new File([new Uint8Array([index])], `recipe-${index}.jpg`, {
          type: "image/jpeg",
        }),
      );
    }

    formData.append(
      "uploadGroups",
      JSON.stringify(
        Array.from({ length: MAX_UPLOAD_RECIPE_GROUPS + 1 }, (_, index) => ({
          clientGroupId: `recipe-${index + 1}`,
          fileIndexes: [index],
        })),
      ),
    );

    expect(() => getImageUploadGroupsFromFormData(formData)).toThrow(
      `You can upload up to ${MAX_UPLOAD_RECIPE_GROUPS} recipe groups at once`,
    );
  });
});
