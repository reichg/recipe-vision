import { z } from "zod";

export const recipeIdSchema = z.string().cuid("Invalid recipe id");

const recipeListSearchQuerySchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalizedValue = value.trim().replace(/\s+/g, " ");

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}, z.string().max(120, "Search query must be 120 characters or less").optional());

export const recipeParamsSchema = z.object({
  id: recipeIdSchema,
});

export const recipeListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
  query: recipeListSearchQuerySchema,
});

export const recipeDeleteBodySchema = z.object({
  ids: z
    .array(recipeIdSchema)
    .min(1, "Missing or invalid 'ids' array")
    .max(100, "Too many recipes requested for deletion")
    .transform((ids) => [...new Set(ids)]),
});
