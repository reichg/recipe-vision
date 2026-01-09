import { RecipeSchema, type RecipeFromSchema } from "../db/schema";
import { getGeminiClient } from "./gemini";
import { logger } from "../logger";

export async function recipeFromOcrText(
  ocrText: string
): Promise<RecipeFromSchema> {
  const ai = getGeminiClient();
  const model = process.env.GEMINI_MODEL || "gemini-2.5-pro";

  // Gemini 2.5 Pro model id :contentReference[oaicite:7]{index=7}
  const prompt = `
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
- If quantity is a fraction like "1/2", convert to decimal (0.5).
- If times appear like "Prep: 10 min", map to minutes.
- If sections exist (e.g., "Sauce"), include that in ingredient notes or name.
- If OCR is messy, make best-effort guesses but never invent ingredients not implied.
- Keep steps in correct order and as short imperative sentences.
- If title is missing, infer from the first bold/heading-like line.

OCR TEXT:
"""
${ocrText}
"""
`.trim();

  const resp = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    // If supported by your SDK version, this nudges clean JSON output:
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = resp.text ?? "";
  if (!text.trim()) throw new Error("Gemini returned empty response");

  const parsed = JSON.parse(text);
  logger.debug("Gemini response parsed", { keys: Object.keys(parsed) });
  const recipe = RecipeSchema.parse(parsed);
  logger.info("Recipe schema validation successful", { title: recipe.title });

  // optional: keep source text for traceability/debugging
  return { ...recipe, sourceText: ocrText };
}
