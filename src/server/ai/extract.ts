import { logger } from "@/lib/logger";
import { RecipeSchema, type RecipeFromSchema } from "@/schemas/recipeSchema";
import { getAiEnv } from "@/server/config/env";
import { AppError } from "@/server/shared/errors";
import { withTimeout } from "@/server/shared/timeout";

import { getGeminiClient } from "./gemini";

function normalizeOcrSegments(ocrSegments: string[]) {
  return ocrSegments.map((segment) => segment.trim()).filter(Boolean);
}

function buildCombinedOcrText(ocrSegments: string[]) {
  return ocrSegments
    .map((segment, index) => `Recipe photo ${index + 1}:\n${segment}`)
    .join("\n\n");
}

function buildExtractionInstructionText() {
  return `
You are a precise recipe extraction engine.

Convert the OCR text into a SINGLE JSON object that matches this shape:

{
  "title": string,
  "description"?: string,
  "servings"?: number,
  "prepTimeMinutes"?: number,
  "cookTimeMinutes"?: number,
  "totalTimeMinutes"?: number,
  "ingredients": Array<{ "name": string, "quantity"?: number, "unit"?: string, "notes"?: string }>,
  "steps": string[],
  "tags"?: string[],
  "allergens"?: string[]
}

Rules:
- Output ONLY valid JSON. No markdown. No extra keys.
- Use recipe content from EVERY OCR photo part provided after these instructions.
- Photos may be out of order. Reconstruct the correct recipe order using visible headings, ingredient lists, and step numbers.
- Later photos often continue ingredient or instruction lists from earlier photos.
- Only ignore a later photo when it is clearly duplicate OCR of an earlier photo.
- Merge overlapping lines across photos instead of stopping after the first photo.
- If quantity is a fraction like "1/2", convert to decimal (0.5).
- If times appear like "Prep: 10 min", map to minutes.
- If sections exist (e.g., "Sauce"), include that in ingredient notes or name.
- If OCR is messy, make best-effort guesses but never invent ingredients not implied.
- Keep steps in correct order and as short imperative sentences.
- If title is missing, infer from the first bold/heading-like line.
`.trim();
}

function buildExtractionParts(ocrSegments: string[]) {
  return [
    { text: buildExtractionInstructionText() },
    ...ocrSegments.map((segment, index) => ({
      text: `Recipe photo ${index + 1} OCR text:\n"""\n${segment}\n"""`,
    })),
  ];
}

export async function recipeFromOcrText(
  ocrSegments: string[],
): Promise<RecipeFromSchema> {
  const ai = getGeminiClient();
  const { GEMINI_MODEL, GEMINI_TIMEOUT_MS } = getAiEnv();
  const normalizedSegments = normalizeOcrSegments(ocrSegments);

  const response = await withTimeout(
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: buildExtractionParts(normalizedSegments),
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    }),
    GEMINI_TIMEOUT_MS,
    new AppError({
      code: "GEMINI_TIMEOUT",
      message: "Recipe extraction timed out",
      statusCode: 502,
    }),
  );

  const text = response.text ?? "";

  if (!text.trim()) {
    throw new AppError({
      code: "GEMINI_EMPTY_RESPONSE",
      message: "Recipe extraction failed",
      statusCode: 502,
    });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new AppError({
      code: "GEMINI_INVALID_RESPONSE",
      message: "Recipe extraction failed",
      statusCode: 502,
      cause: error,
    });
  }

  logger.debug("Gemini response parsed", {
    keys:
      typeof parsed === "object" && parsed !== null ? Object.keys(parsed) : [],
  });

  const recipe = RecipeSchema.parse(parsed);
  const sourceText = buildCombinedOcrText(normalizedSegments);

  logger.info("Recipe schema validation successful", { title: recipe.title });

  return { ...recipe, sourceText };
}
