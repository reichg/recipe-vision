import { randomUUID } from "node:crypto";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { logger } from "@/lib/logger";
import { getS3Env } from "@/server/config/env";
import { AppError, getPublicError, isAppError } from "@/server/shared/errors";

import {
  allowedImageExtensions,
  assertValidImageFiles,
  type ImageUploadGroup,
  s3ObjectKeySchema,
  s3PrefixSchema,
} from "./s3-validation";

type UploadedImage = {
  key: string;
  url: string;
};

type UploadImagesResult = {
  success: true;
  groupKey: string;
  uploads: UploadedImage[];
  message: string;
};

type UploadImageGroupResult = {
  clientGroupId: string;
  groupKey: string;
  uploads: UploadedImage[];
  imageCount: number;
  message: string;
};

export type UploadImageGroupsResult = {
  success: true;
  groupCount: number;
  totalImageCount: number;
  groups: UploadImageGroupResult[];
  message: string;
};

export type ProcessableImageGroup = {
  key: string;
  imageKeys: string[];
};

let cachedS3Client: S3Client | undefined;

function logUploadTelemetry(
  level: "info" | "warn" | "error",
  step: string,
  data: Record<string, unknown>,
) {
  logger[level]("Upload telemetry", {
    flow: "upload",
    step,
    ...data,
  });
}

function getS3Client() {
  const { AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY } = getS3Env();

  cachedS3Client ??= new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  return cachedS3Client;
}

function normalizeConfiguredPrefix(prefix: string) {
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}

function normalizePrefixForKeys(prefix: string) {
  return prefix === "" ? "" : normalizeConfiguredPrefix(prefix);
}

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim();
  const lastDotIndex = trimmed.lastIndexOf(".");
  const basename = lastDotIndex > 0 ? trimmed.slice(0, lastDotIndex) : trimmed;
  const extension =
    lastDotIndex > 0 ? trimmed.slice(lastDotIndex).toLowerCase() : "";

  const safeBasename = basename
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  const safeExtension = extension.replace(/[^a-z0-9.]/g, "");

  return `${safeBasename || "image"}${safeExtension}`;
}

function inferImageContentType(key: string) {
  const lowerKey = key.toLowerCase();

  if (lowerKey.endsWith(".png")) {
    return "image/png";
  }

  if (lowerKey.endsWith(".webp")) {
    return "image/webp";
  }

  if (lowerKey.endsWith(".gif")) {
    return "image/gif";
  }

  return "image/jpeg";
}

function getObjectFileName(key: string) {
  const lastSegment = key.split("/").pop();
  return sanitizeFileName(lastSegment || "image.jpg");
}

function getImageGroupKey(
  objectKey: string,
  effectivePrefix: string,
  unprocessedPrefix: string,
) {
  const groupingPrefix = objectKey.startsWith(unprocessedPrefix)
    ? unprocessedPrefix
    : effectivePrefix;

  if (!groupingPrefix || !objectKey.startsWith(groupingPrefix)) {
    return objectKey;
  }

  const relativeKey = objectKey.slice(groupingPrefix.length);
  const separatorIndex = relativeKey.indexOf("/");

  if (separatorIndex === -1) {
    return objectKey;
  }

  return `${groupingPrefix}${relativeKey.slice(0, separatorIndex + 1)}`;
}

export async function getSignedImageUrl(key: string) {
  const safeKey = s3ObjectKeySchema.parse(key);
  const { AWS_S3_BUCKET, S3_SIGNED_URL_TTL_SECONDS } = getS3Env();

  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: safeKey,
    }),
    { expiresIn: S3_SIGNED_URL_TTL_SECONDS },
  );
}

export async function uploadImage(file: File) {
  const uploadResult = await uploadImages([file]);
  const uploadedImage = uploadResult.uploads[0];

  if (!uploadedImage) {
    throw new AppError({
      code: "INVALID_UPLOAD",
      message: "Missing image file",
      statusCode: 400,
    });
  }

  return {
    success: true,
    key: uploadedImage.key,
    url: uploadedImage.url,
    groupKey: uploadResult.groupKey,
    message: "Image uploaded successfully",
  };
}

export async function uploadImages(files: File[]) {
  assertValidImageFiles(files);

  const { AWS_S3_BUCKET, S3_UNPROCESSED_PREFIX } = getS3Env();
  const groupKey = `${normalizeConfiguredPrefix(S3_UNPROCESSED_PREFIX)}${randomUUID()}/`;
  const uploads: UploadedImage[] = [];
  const startedAt = Date.now();

  logUploadTelemetry("info", "started", {
    groupKey,
    imageCount: files.length,
  });

  try {
    for (const [index, file] of files.entries()) {
      const key = `${groupKey}${String(index + 1).padStart(2, "0")}-${sanitizeFileName(file.name)}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      await getS3Client().send(
        new PutObjectCommand({
          Bucket: AWS_S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        }),
      );

      uploads.push({
        key,
        url: await getSignedImageUrl(key),
      });
    }
  } catch (error) {
    const publicError = getPublicError(error, "Failed to upload images");

    logUploadTelemetry("error", "failed", {
      groupKey,
      imageCount: files.length,
      uploadedCount: uploads.length,
      durationMs: Date.now() - startedAt,
      errorCode: isAppError(error) ? error.code : undefined,
      errorMessage: publicError.message,
    });

    throw error;
  }

  logger.info("Images uploaded successfully", {
    groupKey,
    imageCount: uploads.length,
  });
  logUploadTelemetry("info", "completed", {
    groupKey,
    imageCount: uploads.length,
    durationMs: Date.now() - startedAt,
  });

  return {
    success: true,
    groupKey,
    uploads,
    message: `Uploaded ${uploads.length} image${uploads.length === 1 ? "" : "s"} successfully`,
  } satisfies UploadImagesResult;
}

export async function uploadImageGroups(
  uploadGroups: ImageUploadGroup[],
): Promise<UploadImageGroupsResult> {
  const startedAt = Date.now();
  const groupResults: UploadImageGroupResult[] = [];

  logUploadTelemetry("info", "multi-group.started", {
    groupCount: uploadGroups.length,
    totalImageCount: uploadGroups.reduce(
      (imageCount, uploadGroup) => imageCount + uploadGroup.files.length,
      0,
    ),
  });

  for (const uploadGroup of uploadGroups) {
    const groupResult = await uploadImages(uploadGroup.files);

    groupResults.push({
      clientGroupId: uploadGroup.clientGroupId,
      groupKey: groupResult.groupKey,
      uploads: groupResult.uploads,
      imageCount: groupResult.uploads.length,
      message: groupResult.message,
    });
  }

  const totalImageCount = groupResults.reduce(
    (imageCount, groupResult) => imageCount + groupResult.imageCount,
    0,
  );

  logUploadTelemetry("info", "multi-group.completed", {
    groupCount: groupResults.length,
    totalImageCount,
    durationMs: Date.now() - startedAt,
  });

  return {
    success: true,
    groupCount: groupResults.length,
    totalImageCount,
    groups: groupResults,
    message: `Uploaded ${totalImageCount} image${totalImageCount === 1 ? "" : "s"} across ${groupResults.length} recipe group${groupResults.length === 1 ? "" : "s"} successfully`,
  };
}

export async function listProcessableImageKeys(prefix?: string) {
  const { AWS_S3_BUCKET, S3_UNPROCESSED_PREFIX } = getS3Env();
  const effectivePrefix = s3PrefixSchema.parse(prefix ?? S3_UNPROCESSED_PREFIX);
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await getS3Client().send(
      new ListObjectsV2Command({
        Bucket: AWS_S3_BUCKET,
        Prefix: effectivePrefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of response.Contents || []) {
      const key = object.Key;

      if (
        key &&
        allowedImageExtensions.some((extension) =>
          key.toLowerCase().endsWith(extension),
        )
      ) {
        keys.push(key);
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

export async function listProcessableImageGroups(
  prefix?: string,
): Promise<ProcessableImageGroup[]> {
  const { S3_UNPROCESSED_PREFIX } = getS3Env();
  const effectivePrefix = s3PrefixSchema.parse(prefix ?? S3_UNPROCESSED_PREFIX);
  const normalizedEffectivePrefix = normalizePrefixForKeys(effectivePrefix);
  const normalizedUnprocessedPrefix = normalizeConfiguredPrefix(
    S3_UNPROCESSED_PREFIX,
  );
  const imageGroups = new Map<string, string[]>();

  for (const imageKey of await listProcessableImageKeys(effectivePrefix)) {
    const groupKey = getImageGroupKey(
      imageKey,
      normalizedEffectivePrefix,
      normalizedUnprocessedPrefix,
    );
    const existingImageKeys = imageGroups.get(groupKey) ?? [];

    existingImageKeys.push(imageKey);
    existingImageKeys.sort();
    imageGroups.set(groupKey, existingImageKeys);
  }

  return [...imageGroups.entries()]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, imageKeys]) => ({
      key,
      imageKeys,
    }));
}

export async function deleteImages(keys: string[]) {
  if (keys.length === 0) {
    return;
  }

  const { AWS_S3_BUCKET } = getS3Env();
  const safeKeys = [
    ...new Set(keys.map((key) => s3ObjectKeySchema.parse(key))),
  ];

  await Promise.all(
    safeKeys.map((key) =>
      getS3Client().send(
        new DeleteObjectCommand({
          Bucket: AWS_S3_BUCKET,
          Key: key,
        }),
      ),
    ),
  );

  logger.info("Deleted processed images", {
    imageCount: safeKeys.length,
    keys: safeKeys,
  });
}

export async function downloadImageAsFile(key: string): Promise<File> {
  const safeKey = s3ObjectKeySchema.parse(key);
  const { AWS_S3_BUCKET } = getS3Env();

  const response = await getS3Client().send(
    new GetObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: safeKey,
    }),
  );

  const imageBytes = await response.Body?.transformToByteArray();

  if (!imageBytes) {
    throw new AppError({
      code: "S3_IMAGE_EMPTY",
      message: "Failed to fetch image from storage",
      statusCode: 502,
    });
  }

  const contentType = response.ContentType || inferImageContentType(safeKey);

  return new File(
    [new Blob([new Uint8Array(imageBytes)], { type: contentType })],
    getObjectFileName(safeKey),
    {
      type: contentType,
    },
  );
}
