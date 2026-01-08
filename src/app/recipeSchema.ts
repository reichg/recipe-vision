import { z } from "zod";

export const RecipeIngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const RecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),

  servings: z.number().int().positive().optional().nullable(),

  prepTimeMinutes: z.number().int().nonnegative().optional().nullable(),
  cookTimeMinutes: z.number().int().nonnegative().optional().nullable(),
  totalTimeMinutes: z.number().int().nonnegative().optional().nullable(),

  ingredients: z.array(RecipeIngredientSchema).min(1),
  steps: z.array(z.string().min(1)).min(1),

  tags: z.array(z.string().min(1)).optional().nullable(),
  allergens: z.array(z.string().min(1)).optional().nullable(),

  sourceText: z.string().optional().nullable(),
});

export type RecipeFromSchema = z.infer<typeof RecipeSchema>;
