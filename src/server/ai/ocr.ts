import path from "node:path";

import sharp from "sharp";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { getAiEnv } from "@/server/config/env";
import { AppError } from "@/server/shared/errors";
import { createRateLimitTelemetry } from "@/server/shared/http";

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const MIN_OCR_IMAGE_DIMENSION_PX = 256;
const MAX_OCR_PREPARATION_ATTEMPTS = 6;
const MAX_OCR_IMAGE_PIXELS = 40_000_000;
const OCR_RATE_LIMIT_MESSAGE_PATTERN =
  /(rate\s*limit|too many requests|quota|maximum number of requests|requests per (hour|day)|exceeded the API calls)/i;

let ocrRequestTimestamps: number[] = [];

const OcrSpaceParsedResultSchema = z.object({
  ParsedText: z.string().optional(),
});

const OcrSpaceResponseSchema = z.object({
  IsErroredOnProcessing: z.boolean().optional(),
  ErrorMessage: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
  ParsedResults: z.array(OcrSpaceParsedResultSchema).optional(),
});

function getOcrPreparedFileName(fileName: string) {
  const extension = path.extname(fileName);
  const baseName = extension ? fileName.slice(0, -extension.length) : fileName;

  return `${baseName || "recipe-image"}-ocr.png`;
}

function getOcrProviderErrorMessage(
  errorMessage: string | string[] | null | undefined,
) {
  if (Array.isArray(errorMessage)) {
    return errorMessage.join("; ");
  }

  return errorMessage ?? "Unknown OCR.Space error";
}

function isOcrRateLimitErrorMessage(message: string) {
  return OCR_RATE_LIMIT_MESSAGE_PATTERN.test(message);
}

function createOcrRateLimitedError(cause?: unknown) {
  return new AppError({
    code: "OCR_RATE_LIMITED",
    message: "OCR service is temporarily rate limited. Please try again later.",
    statusCode: 503,
    cause,
  });
}

function pruneOcrRequestTimestamps(now: number) {
  const dayCutoff = now - DAY_IN_MS;

  ocrRequestTimestamps = ocrRequestTimestamps.filter(
    (timestamp) => timestamp > dayCutoff,
  );
}

export function resetOcrRateLimitState() {
  ocrRequestTimestamps = [];
}

export function reserveOcrSpaceQuota(requestCount = 1) {
  if (requestCount <= 0) {
    return;
  }

  const { OCRSPACE_DAILY_LIMIT, OCRSPACE_HOURLY_LIMIT } = getAiEnv();
  const now = Date.now();
  const hourCutoff = now - HOUR_IN_MS;

  pruneOcrRequestTimestamps(now);

  const hourlyCount = ocrRequestTimestamps.filter(
    (timestamp) => timestamp > hourCutoff,
  ).length;
  const dailyCount = ocrRequestTimestamps.length;

  if (
    hourlyCount + requestCount > OCRSPACE_HOURLY_LIMIT ||
    dailyCount + requestCount > OCRSPACE_DAILY_LIMIT
  ) {
    logger.warn("OCR.Space quota would be exceeded", {
      requestCount,
      hourlyCount,
      hourlyLimit: OCRSPACE_HOURLY_LIMIT,
      dailyCount,
      dailyLimit: OCRSPACE_DAILY_LIMIT,
    });

    throw createOcrRateLimitedError({
      requestCount,
      hourlyCount,
      hourlyLimit: OCRSPACE_HOURLY_LIMIT,
      dailyCount,
      dailyLimit: OCRSPACE_DAILY_LIMIT,
    });
  }

  ocrRequestTimestamps.push(...Array.from({ length: requestCount }, () => now));
}

export async function prepareImageForOcr(file: File): Promise<File> {
  const { OCR_MAX_FILE_SIZE_BYTES } = getAiEnv();
  const sourceBuffer = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(sourceBuffer, {
    limitInputPixels: MAX_OCR_IMAGE_PIXELS,
  }).metadata();

  let width = metadata.width;
  let height = metadata.height;
  let lastPreparedSize = sourceBuffer.length;

  for (let attempt = 0; attempt < MAX_OCR_PREPARATION_ATTEMPTS; attempt += 1) {
    let pipeline = sharp(sourceBuffer, {
      limitInputPixels: MAX_OCR_IMAGE_PIXELS,
    })
      .rotate()
      .flatten({ background: "#ffffff" })
      .greyscale()
      .normalise()
      .threshold(170);

    if (width && height) {
      pipeline = pipeline.resize({
        fit: "inside",
        height,
        width,
        withoutEnlargement: true,
      });
    }

    const preparedBuffer = await pipeline
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();

    lastPreparedSize = preparedBuffer.length;

    if (preparedBuffer.length <= OCR_MAX_FILE_SIZE_BYTES) {
      return new File(
        [new Uint8Array(preparedBuffer)],
        getOcrPreparedFileName(file.name),
        {
          type: "image/png",
        },
      );
    }

    if (!width || !height) {
      break;
    }

    if (
      width <= MIN_OCR_IMAGE_DIMENSION_PX ||
      height <= MIN_OCR_IMAGE_DIMENSION_PX
    ) {
      break;
    }

    const shrinkRatio = Math.max(
      0.5,
      Math.sqrt(OCR_MAX_FILE_SIZE_BYTES / preparedBuffer.length) * 0.95,
    );
    const nextWidth = Math.max(
      MIN_OCR_IMAGE_DIMENSION_PX,
      Math.floor(width * shrinkRatio),
    );
    const nextHeight = Math.max(
      MIN_OCR_IMAGE_DIMENSION_PX,
      Math.floor(height * shrinkRatio),
    );

    if (nextWidth === width && nextHeight === height) {
      width = Math.max(MIN_OCR_IMAGE_DIMENSION_PX, width - 64);
      height = Math.max(MIN_OCR_IMAGE_DIMENSION_PX, height - 64);
      continue;
    }

    width = nextWidth;
    height = nextHeight;
  }

  throw new AppError({
    code: "OCR_IMAGE_TOO_LARGE",
    message: "Image is too large to prepare for OCR",
    statusCode: 422,
    cause: {
      fileName: file.name,
      fileSize: file.size,
      preparedSize: lastPreparedSize,
    },
  });
}

function logOcrProviderRequestTelemetry(
  httpStatus: number | null,
  headers?: Headers | Record<string, string>,
) {
  logger.info("OCR provider request telemetry", {
    provider: "ocr-space",
    operation: "parseImage",
    transport: "fetch",
    httpStatus,
    responseReceived: httpStatus !== null,
    rateLimit: createRateLimitTelemetry(headers, httpStatus ?? undefined),
  });
}

export async function ocrSpaceExtractText(file: File): Promise<string> {
  const { OCRSPACE_API_KEY, OCR_TIMEOUT_MS } = getAiEnv();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);
  const preparedFile = await prepareImageForOcr(file);

  reserveOcrSpaceQuota();

  logger.debug("Starting OCR.Space extraction", {
    fileName: file.name,
    fileSize: file.size,
    preparedFileName: preparedFile.name,
    preparedFileSize: preparedFile.size,
  });

  const form = new FormData();
  form.append("file", preparedFile);
  form.append("language", "eng");
  form.append("scale", "true");
  form.append("OCREngine", "2");

  logger.info("Parsing image with OCR.Space API");
  let response: Response;

  try {
    response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: OCRSPACE_API_KEY,
      },
      body: form,
      signal: controller.signal,
    });
  } catch (error) {
    logOcrProviderRequestTelemetry(null);

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AppError({
        code: "OCR_TIMEOUT",
        message: "Image parsing timed out",
        statusCode: 502,
        cause: error,
      });
    }

    throw new AppError({
      code: "OCR_REQUEST_FAILED",
      message: "Image parsing failed",
      statusCode: 502,
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }

  logOcrProviderRequestTelemetry(response.status, response.headers);

  if (!response.ok) {
    if (response.status === 429) {
      throw createOcrRateLimitedError({
        status: response.status,
        statusText: response.statusText,
      });
    }

    logger.error("OCR.Space request failed", {
      status: response.status,
      statusText: response.statusText,
    });

    throw new AppError({
      code: "OCR_REQUEST_FAILED",
      message: "Image parsing failed",
      statusCode: 502,
      cause: {
        status: response.status,
        statusText: response.statusText,
      },
    });
  }

  let data: z.infer<typeof OcrSpaceResponseSchema>;

  try {
    data = OcrSpaceResponseSchema.parse(await response.json());
  } catch (error) {
    throw new AppError({
      code: "OCR_INVALID_RESPONSE",
      message: "Image parsing failed",
      statusCode: 502,
      cause: error,
    });
  }

  if (data.IsErroredOnProcessing) {
    const message = getOcrProviderErrorMessage(data.ErrorMessage);

    if (isOcrRateLimitErrorMessage(message)) {
      throw createOcrRateLimitedError(message);
    }

    logger.error("OCR.Space processing error", { message });

    throw new AppError({
      code: "OCR_PROCESSING_FAILED",
      message: "Image parsing failed",
      statusCode: 502,
      cause: message,
    });
  }

  const text =
    data.ParsedResults?.map((result) => result.ParsedText ?? "")
      .join("\n")
      .trim() ?? "";

  if (!text) {
    logger.error("OCR.Space returned empty text");

    throw new AppError({
      code: "OCR_EMPTY_TEXT",
      message: "Image did not contain readable recipe text",
      statusCode: 422,
    });
  }

  logger.info("Image parsed successfully", { textLength: text.length });

  return text;
}
