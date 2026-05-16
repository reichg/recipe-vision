import { z } from "zod";

import { getUploadEnv } from "@/server/config/env";
import { AppError } from "@/server/shared/errors";

export const allowedImageMimeTypes = [
  "image/gif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const allowedImageExtensions = [
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
] as const;

const allowedImageMimeTypeSet = new Set<string>(allowedImageMimeTypes);

function isSafeS3Path(value: string) {
  return (
    !value.startsWith("/") &&
    !value.includes("\\") &&
    value.split("/").every((segment) => segment !== "..")
  );
}

export const s3ObjectKeySchema = z
  .string()
  .trim()
  .min(1, "Object key is required")
  .max(1024, "Object key is too long")
  .refine(isSafeS3Path, "Invalid object key");

export const s3PrefixSchema = z
  .string()
  .trim()
  .max(1024, "Prefix is too long")
  .refine((value) => value === "" || isSafeS3Path(value), "Invalid prefix");

const allowedImageFormFieldNames = new Set(["image", "images"]);

export function assertValidImageFile(file: File): void {
  const { MAX_UPLOAD_IMAGE_SIZE_BYTES } = getUploadEnv();

  if (!(file instanceof File)) {
    throw new AppError({
      code: "INVALID_UPLOAD",
      message: "Missing image file",
      statusCode: 400,
    });
  }

  if (!allowedImageMimeTypeSet.has(file.type)) {
    throw new AppError({
      code: "UNSUPPORTED_IMAGE_TYPE",
      message: "Uploaded file must be a supported image",
      statusCode: 400,
    });
  }

  if (file.size <= 0) {
    throw new AppError({
      code: "EMPTY_UPLOAD",
      message: "Uploaded file is empty",
      statusCode: 400,
    });
  }

  if (file.size > MAX_UPLOAD_IMAGE_SIZE_BYTES) {
    throw new AppError({
      code: "UPLOAD_TOO_LARGE",
      message: `Uploaded file is too large (max ${Math.floor(MAX_UPLOAD_IMAGE_SIZE_BYTES / 1024)} KB)`,
      statusCode: 400,
    });
  }
}

export function assertValidImageFiles(files: File[]) {
  if (files.length === 0) {
    throw new AppError({
      code: "INVALID_UPLOAD",
      message: "Missing image file",
      statusCode: 400,
    });
  }

  for (const file of files) {
    assertValidImageFile(file);
  }
}

export function getImageFilesFromFormData(formData: FormData) {
  const files: File[] = [];

  for (const [fieldName, value] of formData.entries()) {
    if (allowedImageFormFieldNames.has(fieldName) && value instanceof File) {
      files.push(value);
    }
  }

  assertValidImageFiles(files);

  return files;
}
