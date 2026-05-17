import { z } from "zod";

import { RecipeSchema } from "./recipeSchema";

export const MAX_RECIPES_PER_LLM_BATCH = 10;

export const ExtractedRecipeSchema = RecipeSchema.omit({
  sourceText: true,
}).strict();

export const RecipeBatchItemSchema = z
  .object({
    recipeId: z.string().min(1),
    recipe: ExtractedRecipeSchema,
  })
  .strict();

export const RecipeBatchResponseSchema = z
  .object({
    recipes: z
      .array(RecipeBatchItemSchema)
      .min(1)
      .max(MAX_RECIPES_PER_LLM_BATCH),
  })
  .strict();
