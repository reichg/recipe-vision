import { z } from "zod";

export const MAX_UPLOAD_RECIPE_GROUPS = 10;

export const uploadGroupManifestItemSchema = z
  .object({
    clientGroupId: z
      .string()
      .trim()
      .min(1, "Recipe group id is required")
      .max(64, "Recipe group id is too long"),
    fileIndexes: z
      .array(z.number().int().nonnegative())
      .min(1, "Each recipe group must include at least one image"),
  })
  .strict();

export const uploadGroupManifestSchema = z
  .array(uploadGroupManifestItemSchema)
  .min(1, "At least one recipe group is required")
  .max(
    MAX_UPLOAD_RECIPE_GROUPS,
    `You can upload up to ${MAX_UPLOAD_RECIPE_GROUPS} recipe groups at once`,
  )
  .superRefine((groups, context) => {
    const seenGroupIds = new Set<string>();
    const seenFileIndexes = new Map<number, string>();

    groups.forEach((group, groupIndex) => {
      if (seenGroupIds.has(group.clientGroupId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Recipe group ids must be unique",
          path: [groupIndex, "clientGroupId"],
        });
      }

      seenGroupIds.add(group.clientGroupId);

      const uniqueIndexes = new Set<number>();

      group.fileIndexes.forEach((fileIndex, fileIndexPosition) => {
        if (uniqueIndexes.has(fileIndex)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A recipe group cannot reference the same image twice",
            path: [groupIndex, "fileIndexes", fileIndexPosition],
          });
        }

        uniqueIndexes.add(fileIndex);

        if (seenFileIndexes.has(fileIndex)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Each uploaded image can belong to only one recipe group",
            path: [groupIndex, "fileIndexes", fileIndexPosition],
          });
        }

        seenFileIndexes.set(fileIndex, group.clientGroupId);
      });
    });
  });

export type UploadGroupManifest = z.infer<typeof uploadGroupManifestSchema>;
