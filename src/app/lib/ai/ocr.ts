type OcrSpaceParsedResult = {
  ParsedText?: string;
};

type OcrSpaceResponse = {
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[] | null;
  ParsedResults?: OcrSpaceParsedResult[];
};

import { logger } from "../logger";

export async function ocrSpaceExtractText(file: File): Promise<string> {
  const apiKey = process.env.OCRSPACE_API_KEY;
  if (!apiKey) throw new Error("Missing OCRSPACE_API_KEY");

  logger.debug("Starting OCR.Space extraction", {
    fileName: file.name,
    fileSize: file.size,
  });

  const form = new FormData();
  form.append("file", file); // Browser-style File works in Next route handlers
  form.append("language", "eng");
  form.append("scale", "true"); // often improves OCR (OCR.Space supports it)
  form.append("OCREngine", "2"); // optional; many users report better results

  logger.info("Parsing image with OCR.Space API");
  const res = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: {
      apikey: apiKey, // supported header auth :contentReference[oaicite:5]{index=5}
    },
    body: form,
  });

  if (!res.ok) {
    logger.error("OCR.Space request failed", {
      status: res.status,
      statusText: res.statusText,
    });
    throw new Error(
      `OCR.Space request failed: ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as OcrSpaceResponse;

  if (data.IsErroredOnProcessing) {
    const msg = Array.isArray(data.ErrorMessage)
      ? data.ErrorMessage.join("; ")
      : data.ErrorMessage ?? "Unknown OCR.Space error";
    logger.error("OCR.Space processing error", { message: msg });
    throw new Error(`OCR.Space error: ${msg}`);
  }

  const text =
    data.ParsedResults?.map((r) => r.ParsedText ?? "")
      .join("\n")
      .trim() ?? "";

  if (!text) {
    logger.error("OCR.Space returned empty text");
    throw new Error("OCR.Space returned empty text");
  }

  logger.info("Image parsed successfully", { textLength: text.length });
  return text;
}
