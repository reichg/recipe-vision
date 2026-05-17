import { z } from "zod";

import { MAX_RECIPES_PER_LLM_BATCH } from "@/schemas/recipeBatchSchema";

import { s3PrefixSchema } from "./s3-validation";

export const batchProcessBodySchema = z.object({
  prefix: s3PrefixSchema.optional(),
  limit: z
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(
      MAX_RECIPES_PER_LLM_BATCH,
      `Limit must be ${MAX_RECIPES_PER_LLM_BATCH} or less`,
    )
    .optional(),
});

export const batchProcessQuerySchema = z.object({
  prefix: s3PrefixSchema.optional(),
});
