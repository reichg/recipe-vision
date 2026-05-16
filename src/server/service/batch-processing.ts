import { logger } from "@/lib/logger";
import type { RecipeFromSchema } from "@/schemas/recipeSchema";
import { getS3Env } from "@/server/config/env";
import { getPublicError } from "@/server/shared/errors";

import {
  createRecipeFromImages,
  findRecipeBySourceImageGroupKey,
} from "./recipes";
import {
  deleteImages,
  downloadImageAsFile,
  listProcessableImageGroups,
  type ProcessableImageGroup,
  uploadImages,
} from "./s3";

type BatchProcessResult = {
  key: string;
  status: "success" | "error";
  recipeId?: string;
  error?: string;
};

type ProcessRecipeImageGroupResult =
  | {
      key: string;
      status: "success";
      recipeId: string;
      recipe: RecipeFromSchema;
      cleanupWarning?: string;
    }
  | {
      key: string;
      status: "error";
      error: string;
    };

export type UploadAndProcessImagesResult = {
  success: true;
  groupKey: string;
  uploads: Array<{ key: string; url: string }>;
  message: string;
  processing:
    | {
        status: "completed";
        recipeId: string;
        recipe: RecipeFromSchema;
        warning?: string;
      }
    | {
        status: "failed";
        error: string;
      };
};

async function deleteSourceImages(
  groupKey: string,
  imageKeys: string[],
  failurePrefix: string,
) {
  try {
    await deleteImages(imageKeys);
    return undefined;
  } catch (error) {
    const cleanupError = getPublicError(
      error,
      "Failed to delete processed images",
    ).message;

    logger.error("Failed to delete processed images", {
      key: groupKey,
      imageKeys,
      error: error instanceof Error ? error.message : error,
    });

    return `${failurePrefix}: ${cleanupError}`;
  }
}

export type BatchProcessEvent =
  | {
      type: "total";
      count: number;
    }
  | {
      type: "progress";
      key: string;
    }
  | {
      type: "result";
      result: BatchProcessResult;
    };

function toBatchProcessResult(
  result: ProcessRecipeImageGroupResult,
): BatchProcessResult {
  if (result.status === "error") {
    return result;
  }

  return {
    key: result.key,
    status: "success",
    recipeId: result.recipeId,
    error: result.cleanupWarning,
  };
}

async function processRecipeImageGroup(
  imageGroup: ProcessableImageGroup,
): Promise<ProcessRecipeImageGroupResult> {
  try {
    const existingRecipe = await findRecipeBySourceImageGroupKey(
      imageGroup.key,
    );

    if (existingRecipe) {
      const cleanupWarning = await deleteSourceImages(
        imageGroup.key,
        imageGroup.imageKeys,
        "Recipe already existed, but failed to delete source images",
      );

      return {
        key: imageGroup.key,
        status: "success",
        recipeId: existingRecipe.id,
        recipe: existingRecipe.recipe,
        cleanupWarning,
      };
    }

    const files = await Promise.all(
      imageGroup.imageKeys.map((imageKey) => downloadImageAsFile(imageKey)),
    );
    const savedRecipe = await createRecipeFromImages(files, {
      sourceImageGroupKey: imageGroup.key,
    });
    const cleanupWarning = await deleteSourceImages(
      imageGroup.key,
      imageGroup.imageKeys,
      "Recipe saved, but failed to delete source images",
    );

    return {
      key: imageGroup.key,
      status: "success",
      recipeId: savedRecipe.id,
      recipe: savedRecipe.recipe,
      cleanupWarning,
    };
  } catch (error) {
    const publicError = getPublicError(
      error,
      "Failed to process recipe images",
    );

    logger.error("Failed to process recipe images", {
      key: imageGroup.key,
      imageKeys: imageGroup.imageKeys,
      error: error instanceof Error ? error.message : error,
    });

    return {
      key: imageGroup.key,
      status: "error",
      error: publicError.message,
    };
  }
}

export async function uploadAndProcessImages(
  files: File[],
): Promise<UploadAndProcessImagesResult> {
  const uploadResult = await uploadImages(files);
  const processingResult = await processRecipeImageGroup({
    key: uploadResult.groupKey,
    imageKeys: uploadResult.uploads.map(({ key }) => key),
  });
  const imageCount = uploadResult.uploads.length;
  const imageLabel = `image${imageCount === 1 ? "" : "s"}`;

  if (processingResult.status === "error") {
    const publicError = processingResult.error.endsWith(".")
      ? processingResult.error
      : `${processingResult.error}.`;

    logger.warn("Automatic recipe processing failed after upload", {
      groupKey: uploadResult.groupKey,
      imageCount,
      error: processingResult.error,
    });

    return {
      success: true,
      groupKey: uploadResult.groupKey,
      uploads: uploadResult.uploads,
      message: `Uploaded ${imageCount} ${imageLabel}, but automatic processing failed`,
      processing: {
        status: "failed",
        error: `${publicError} The uploaded images remain available for retry from batch processing.`,
      },
    };
  }

  return {
    success: true,
    groupKey: uploadResult.groupKey,
    uploads: uploadResult.uploads,
    message: `Uploaded ${imageCount} ${imageLabel} and processed the recipe successfully`,
    processing: {
      status: "completed",
      recipeId: processingResult.recipeId,
      recipe: processingResult.recipe,
      warning: processingResult.cleanupWarning,
    },
  };
}

export async function* processRecipeBatch(
  prefix?: string,
): AsyncGenerator<BatchProcessEvent> {
  const effectivePrefix = prefix ?? getS3Env().S3_UNPROCESSED_PREFIX;
  const imageGroups = await listProcessableImageGroups(effectivePrefix);

  logger.info("Starting batch processing", {
    prefix: effectivePrefix,
    count: imageGroups.length,
  });

  yield {
    type: "total",
    count: imageGroups.length,
  };

  for (const imageGroup of imageGroups) {
    yield {
      type: "progress",
      key: imageGroup.key,
    };

    yield {
      type: "result",
      result: toBatchProcessResult(await processRecipeImageGroup(imageGroup)),
    };
  }
}
