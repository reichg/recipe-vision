import { z } from "zod";

import { logger } from "@/lib/logger";
import { getAiEnv } from "@/server/config/env";
import { AppError } from "@/server/shared/errors";

const OcrSpaceParsedResultSchema = z.object({
  ParsedText: z.string().optional(),
});

const OcrSpaceResponseSchema = z.object({
  IsErroredOnProcessing: z.boolean().optional(),
  ErrorMessage: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
  ParsedResults: z.array(OcrSpaceParsedResultSchema).optional(),
});

export async function ocrSpaceExtractText(file: File): Promise<string> {
  const { OCRSPACE_API_KEY, OCR_TIMEOUT_MS } = getAiEnv();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

  logger.debug("Starting OCR.Space extraction", {
    fileName: file.name,
    fileSize: file.size,
  });

  const form = new FormData();
  form.append("file", file);
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
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AppError({
        code: "OCR_TIMEOUT",
        message: "Image parsing timed out",
        statusCode: 502,
        cause: error,
      });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
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

  const data = OcrSpaceResponseSchema.parse(await response.json());

  if (data.IsErroredOnProcessing) {
    const message = Array.isArray(data.ErrorMessage)
      ? data.ErrorMessage.join("; ")
      : (data.ErrorMessage ?? "Unknown OCR.Space error");

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
