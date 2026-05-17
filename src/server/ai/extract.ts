import { logger } from "@/lib/logger";
import {
  MAX_RECIPES_PER_LLM_BATCH,
  RecipeBatchResponseSchema,
} from "@/schemas/recipeBatchSchema";
import { RecipeSchema, type RecipeFromSchema } from "@/schemas/recipeSchema";
import { AppError } from "@/server/shared/errors";

import {
  generateStructuredRecipeBatchJsonText,
  generateStructuredRecipeJsonText,
} from "./llm";

type RecipeOcrBatchInput = {
  recipeId: string;
  ocrSegments: string[];
};

type RecipeBatchResult = {
  recipeId: string;
  recipe: RecipeFromSchema;
};

const RECIPE_JSON_SHAPE = `{
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
}`;

const SHARED_EXTRACTION_RULES = `
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

function normalizeOcrSegments(ocrSegments: string[]) {
  return ocrSegments.map((segment) => segment.trim()).filter(Boolean);
}

function normalizeRecipeBatchInputs(recipeInputs: RecipeOcrBatchInput[]) {
  const seenRecipeIds = new Set<string>();

  return recipeInputs.map(({ recipeId, ocrSegments }) => {
    const normalizedRecipeId = recipeId.trim();

    if (!normalizedRecipeId) {
      throw new AppError({
        code: "LLM_INVALID_RESPONSE",
        message: "Recipe extraction failed",
        statusCode: 502,
      });
    }

    if (seenRecipeIds.has(normalizedRecipeId)) {
      throw new AppError({
        code: "LLM_INVALID_RESPONSE",
        message: "Recipe extraction failed",
        statusCode: 502,
      });
    }

    seenRecipeIds.add(normalizedRecipeId);

    return {
      recipeId: normalizedRecipeId,
      ocrSegments: normalizeOcrSegments(ocrSegments),
    };
  });
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

${RECIPE_JSON_SHAPE}

Rules:
- Output ONLY valid JSON. No markdown. No extra keys.
${SHARED_EXTRACTION_RULES}
`.trim();
}

function buildBatchExtractionInstructionText(recipeIds: string[]) {
  return `
You are a precise recipe extraction engine.

Convert the OCR text into a SINGLE JSON object that matches this shape:

{
  "recipes": Array<{
    "recipeId": string,
    "recipe": ${RECIPE_JSON_SHAPE}
  }>
}

Rules:
- Output ONLY valid JSON. No markdown. No extra keys.
- Return exactly one item in "recipes" for each recipe identifier provided after these instructions.
- Preserve each "recipeId" exactly as provided.
- Do not merge content from different recipe identifiers into one recipe.
- Each recipe identifier may have multiple OCR photo parts.
- The recipe identifiers in this request are: ${recipeIds.join(", ")}.
${SHARED_EXTRACTION_RULES}
`.trim();
}

function parseRecipeResponse(
  text: string,
  normalizedSegments: string[],
): RecipeFromSchema {
  if (!text.trim()) {
    throw new AppError({
      code: "LLM_EMPTY_RESPONSE",
      message: "Recipe extraction failed",
      statusCode: 502,
    });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new AppError({
      code: "LLM_INVALID_RESPONSE",
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

function parseRecipeBatchResponse(
  text: string,
  normalizedRecipeInputs: RecipeOcrBatchInput[],
): RecipeBatchResult[] {
  if (!text.trim()) {
    throw new AppError({
      code: "LLM_EMPTY_RESPONSE",
      message: "Recipe extraction failed",
      statusCode: 502,
    });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new AppError({
      code: "LLM_INVALID_RESPONSE",
      message: "Recipe extraction failed",
      statusCode: 502,
      cause: error,
    });
  }

  logger.debug("LLM batch response parsed", {
    recipeCount:
      typeof parsed === "object" &&
      parsed !== null &&
      "recipes" in parsed &&
      Array.isArray((parsed as { recipes?: unknown }).recipes)
        ? (parsed as { recipes: unknown[] }).recipes.length
        : undefined,
  });

  let batchResponse: ReturnType<typeof RecipeBatchResponseSchema.parse>;

  try {
    batchResponse = RecipeBatchResponseSchema.parse(parsed);
  } catch (error) {
    throw new AppError({
      code: "LLM_INVALID_RESPONSE",
      message: "Recipe extraction failed",
      statusCode: 502,
      cause: error,
    });
  }

  if (batchResponse.recipes.length !== normalizedRecipeInputs.length) {
    throw new AppError({
      code: "LLM_INVALID_RESPONSE",
      message: "Recipe extraction failed",
      statusCode: 502,
      cause: {
        expectedCount: normalizedRecipeInputs.length,
        receivedCount: batchResponse.recipes.length,
      },
    });
  }

  const expectedRecipeIds = new Set(
    normalizedRecipeInputs.map(({ recipeId }) => recipeId),
  );
  const recipesById = new Map<string, RecipeFromSchema>();

  for (const item of batchResponse.recipes) {
    if (
      !expectedRecipeIds.has(item.recipeId) ||
      recipesById.has(item.recipeId)
    ) {
      throw new AppError({
        code: "LLM_INVALID_RESPONSE",
        message: "Recipe extraction failed",
        statusCode: 502,
        cause: {
          recipeId: item.recipeId,
          knownRecipeIds: Array.from(expectedRecipeIds),
        },
      });
    }

    recipesById.set(item.recipeId, item.recipe);
  }

  const results = normalizedRecipeInputs.map(({ recipeId, ocrSegments }) => {
    const recipe = recipesById.get(recipeId);

    if (!recipe) {
      throw new AppError({
        code: "LLM_INVALID_RESPONSE",
        message: "Recipe extraction failed",
        statusCode: 502,
        cause: { recipeId },
      });
    }

    return {
      recipeId,
      recipe: {
        ...recipe,
        sourceText: buildCombinedOcrText(ocrSegments),
      },
    };
  });

  logger.info("Recipe batch schema validation successful", {
    recipeCount: results.length,
  });

  return results;
}

export async function recipeFromOcrText(
  ocrSegments: string[],
): Promise<RecipeFromSchema> {
  const normalizedSegments = normalizeOcrSegments(ocrSegments);
  const text = await generateStructuredRecipeJsonText({
    instructionText: buildExtractionInstructionText(),
    ocrSegments: normalizedSegments,
  });

  return parseRecipeResponse(text, normalizedSegments);
}

export async function recipesFromOcrTextGroups(
  recipeInputs: RecipeOcrBatchInput[],
): Promise<RecipeBatchResult[]> {
  if (recipeInputs.length === 0) {
    return [];
  }

  if (recipeInputs.length > MAX_RECIPES_PER_LLM_BATCH) {
    throw new AppError({
      code: "LLM_BATCH_LIMIT_EXCEEDED",
      message: "Recipe extraction failed",
      statusCode: 500,
      cause: {
        limit: MAX_RECIPES_PER_LLM_BATCH,
        receivedCount: recipeInputs.length,
      },
    });
  }

  const normalizedRecipeInputs = normalizeRecipeBatchInputs(recipeInputs);
  const text = await generateStructuredRecipeBatchJsonText({
    instructionText: buildBatchExtractionInstructionText(
      normalizedRecipeInputs.map(({ recipeId }) => recipeId),
    ),
    recipeInputs: normalizedRecipeInputs,
  });

  return parseRecipeBatchResponse(text, normalizedRecipeInputs);
}
