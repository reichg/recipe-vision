import { z } from "zod";

import { s3PrefixSchema } from "./s3-validation";

export const batchProcessBodySchema = z.object({
  prefix: s3PrefixSchema.optional(),
});