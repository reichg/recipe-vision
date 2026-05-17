import { logger } from "@/lib/logger";
import { MAX_RECIPES_PER_LLM_BATCH } from "@/schemas/recipeBatchSchema";
import { getS3Env } from "@/server/config/env";
import { AppError, getPublicError, isAppError } from "@/server/shared/errors";

import {
  extractOcrSegmentsFromImages,
  extractRecipesFromOcrSegmentGroups,
  findRecipeBySourceImageGroupKey,
  persistRecipe,
} from "./recipes";
import {
  deleteImages,
  downloadImageAsFile,
  listProcessableImageGroups,
  type ProcessableImageGroup,
} from "./s3";

type BatchProcessResult = {
  key: string;
  status: "success" | "error";
  imageCount: number;
  recipeId?: string;
  recipeTitle?: string;
  message: string;
};

type PendingRecipeBatchItem = {
  key: string;
  imageKeys: string[];
  imageCount: number;
  ocrSegments: string[];
};

export type PendingRecipeGroupSummary = {
  prefix: string;
  pendingRecipeCount: number;
  maxProcessLimit: number;
};

type ProcessRecipeBatchOptions = {
  limit?: number;
  runId?: string;
};

type BatchTelemetryContext = {
  prefix: string;
  runId?: string;
};

function logBatchTelemetry(
  level: "info" | "warn" | "error",
  step: string,
  data: Record<string, unknown>,
) {
  logger[level]("Batch processing telemetry", {
    flow: "batch-processing",
    step,
    ...data,
  });
}

function normalizeBatchProcessLimit(limit?: number) {
  if (limit === undefined) {
    return undefined;
  }

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_RECIPES_PER_LLM_BATCH
  ) {
    throw new AppError({
      code: "INVALID_BATCH_LIMIT",
      message: `Batch limit must be between 1 and ${MAX_RECIPES_PER_LLM_BATCH}`,
      statusCode: 400,
    });
  }

  return limit;
}

async function getPendingImageGroups(prefix?: string) {
  const effectivePrefix = prefix ?? getS3Env().S3_UNPROCESSED_PREFIX;
  const imageGroups = await listProcessableImageGroups(effectivePrefix);

  return {
    effectivePrefix,
    imageGroups,
    pendingRecipeCount: imageGroups.length,
    maxProcessLimit: Math.min(imageGroups.length, MAX_RECIPES_PER_LLM_BATCH),
  };
}

function createExistingRecipeMessage(recipeTitle: string, recipeId: string) {
  return `Reused existing recipe "${recipeTitle}" (${recipeId}).`;
}

function createSuccessMessage(
  recipeTitle: string,
  recipeId: string,
  imageCount: number,
) {
  return `Extracted "${recipeTitle}" from ${imageCount} image${imageCount === 1 ? "" : "s"} and saved it as recipe ${recipeId}.`;
}

function createDetailedErrorMessage(stage: string, message: string) {
  return `Failed during ${stage}: ${message}`;
}

async function deleteSourceImages(
  groupKey: string,
  imageKeys: string[],
  failurePrefix: string,
  telemetryContext: BatchTelemetryContext,
) {
  const startedAt = Date.now();

  try {
    await deleteImages(imageKeys);

    logBatchTelemetry("info", "group.cleanup.completed", {
      ...telemetryContext,
      groupKey,
      imageCount: imageKeys.length,
      durationMs: Date.now() - startedAt,
    });

    return undefined;
  } catch (error) {
    const cleanupError = getPublicError(
      error,
      "Failed to delete processed images",
    ).message;

    logBatchTelemetry("warn", "group.cleanup.failed", {
      ...telemetryContext,
      key: groupKey,
      imageCount: imageKeys.length,
      durationMs: Date.now() - startedAt,
      errorCode: isAppError(error) ? error.code : undefined,
      errorMessage: cleanupError,
    });

    return `${failurePrefix}: ${cleanupError}`;
  }
}

function createBatchProcessErrorResult(
  imageGroup: Pick<ProcessableImageGroup, "key" | "imageKeys">,
  stage: string,
  error: unknown,
): BatchProcessResult {
  const publicError = getPublicError(error, "Failed to process recipe images");

  return {
    key: imageGroup.key,
    status: "error",
    imageCount: imageGroup.imageKeys.length,
    message: createDetailedErrorMessage(stage, publicError.message),
  };
}

export type BatchProcessEvent =
  | {
      type: "total";
      count: number;
    }
  | {
      type: "progress";
      key: string;
      index: number;
      total: number;
      message: string;
    }
  | {
      type: "result";
      result: BatchProcessResult;
    };

export async function getPendingRecipeGroupSummary(
  prefix?: string,
): Promise<PendingRecipeGroupSummary> {
  const startedAt = Date.now();
  const { effectivePrefix, pendingRecipeCount, maxProcessLimit } =
    await getPendingImageGroups(prefix);

  logBatchTelemetry("info", "summary.completed", {
    prefix: effectivePrefix,
    pendingRecipeCount,
    maxProcessLimit,
    durationMs: Date.now() - startedAt,
  });

  return {
    prefix: effectivePrefix,
    pendingRecipeCount,
    maxProcessLimit,
  };
}

async function flushPendingRecipeBatch(
  pendingRecipeBatch: PendingRecipeBatchItem[],
  telemetryContext: BatchTelemetryContext,
): Promise<BatchProcessResult[]> {
  if (pendingRecipeBatch.length === 0) {
    return [];
  }

  const batchStartedAt = Date.now();

  logBatchTelemetry("info", "extraction.batch.started", {
    ...telemetryContext,
    groupCount: pendingRecipeBatch.length,
  });

  let extractedRecipes: Awaited<
    ReturnType<typeof extractRecipesFromOcrSegmentGroups>
  >;

  try {
    extractedRecipes = await extractRecipesFromOcrSegmentGroups(
      pendingRecipeBatch.map(({ key, ocrSegments }) => ({
        sourceImageGroupKey: key,
        ocrSegments,
      })),
    );
  } catch (error) {
    const publicError = getPublicError(
      error,
      "Failed to process recipe images",
    );

    logBatchTelemetry("error", "extraction.batch.failed", {
      ...telemetryContext,
      groupCount: pendingRecipeBatch.length,
      durationMs: Date.now() - batchStartedAt,
      errorCode: isAppError(error) ? error.code : undefined,
      errorMessage: publicError.message,
    });

    return pendingRecipeBatch.map(({ key }) => ({
      key,
      status: "error",
      imageCount:
        pendingRecipeBatch.find((pendingGroup) => pendingGroup.key === key)
          ?.imageCount ?? 0,
      message: createDetailedErrorMessage(
        "structured recipe extraction",
        publicError.message,
      ),
    }));
  }

  logBatchTelemetry("info", "extraction.batch.completed", {
    ...telemetryContext,
    groupCount: pendingRecipeBatch.length,
    durationMs: Date.now() - batchStartedAt,
  });

  const extractedRecipesByKey = new Map(
    extractedRecipes.map(({ sourceImageGroupKey, recipe }) => [
      sourceImageGroupKey,
      recipe,
    ]),
  );
  const results: BatchProcessResult[] = [];

  for (const pendingGroup of pendingRecipeBatch) {
    const recipe = extractedRecipesByKey.get(pendingGroup.key);

    if (!recipe) {
      results.push({
        key: pendingGroup.key,
        status: "error",
        imageCount: pendingGroup.imageCount,
        message: createDetailedErrorMessage(
          "mapping extracted recipe data",
          "Recipe extraction failed",
        ),
      });
      continue;
    }

    const persistStartedAt = Date.now();

    try {
      const savedRecipe = await persistRecipe(recipe, {
        sourceImageGroupKey: pendingGroup.key,
      });

      logBatchTelemetry("info", "group.persist.completed", {
        ...telemetryContext,
        groupKey: pendingGroup.key,
        imageCount: pendingGroup.imageCount,
        recipeId: savedRecipe.id,
        recipeTitle: recipe.title,
        durationMs: Date.now() - persistStartedAt,
      });

      const cleanupWarning = await deleteSourceImages(
        pendingGroup.key,
        pendingGroup.imageKeys,
        "Recipe saved, but failed to delete source images",
        telemetryContext,
      );
      const baseMessage = createSuccessMessage(
        recipe.title,
        savedRecipe.id,
        pendingGroup.imageCount,
      );

      results.push({
        key: pendingGroup.key,
        status: "success",
        imageCount: pendingGroup.imageCount,
        recipeId: savedRecipe.id,
        recipeTitle: recipe.title,
        message: cleanupWarning
          ? `${baseMessage} ${cleanupWarning}`
          : baseMessage,
      });
    } catch (error) {
      const publicError = getPublicError(
        error,
        "Failed to process recipe images",
      );

      logBatchTelemetry("error", "group.persist.failed", {
        ...telemetryContext,
        groupKey: pendingGroup.key,
        imageCount: pendingGroup.imageCount,
        durationMs: Date.now() - persistStartedAt,
        errorCode: isAppError(error) ? error.code : undefined,
        errorMessage: publicError.message,
      });

      results.push({
        key: pendingGroup.key,
        status: "error",
        imageCount: pendingGroup.imageCount,
        message: createDetailedErrorMessage(
          "recipe persistence",
          publicError.message,
        ),
      });
    }
  }

  return results;
}

export async function* processRecipeBatch(
  prefix?: string,
  options: ProcessRecipeBatchOptions = {},
): AsyncGenerator<BatchProcessEvent> {
  const requestedLimit = normalizeBatchProcessLimit(options.limit);
  const runStartedAt = Date.now();
  const { effectivePrefix, imageGroups, pendingRecipeCount, maxProcessLimit } =
    await getPendingImageGroups(prefix);
  const selectedCount = Math.min(
    requestedLimit ?? maxProcessLimit,
    pendingRecipeCount,
  );
  const selectedImageGroups = imageGroups.slice(0, selectedCount);
  const pendingRecipeBatch: PendingRecipeBatchItem[] = [];
  const telemetryContext: BatchTelemetryContext = {
    prefix: effectivePrefix,
    runId: options.runId,
  };
  let successCount = 0;
  let errorCount = 0;

  logBatchTelemetry("info", "run.started", {
    ...telemetryContext,
    pendingRecipeCount,
    requestedLimit: requestedLimit ?? null,
    selectedCount,
  });

  yield {
    type: "total",
    count: selectedCount,
  };

  for (const [index, imageGroup] of selectedImageGroups.entries()) {
    yield {
      type: "progress",
      key: imageGroup.key,
      index: index + 1,
      total: selectedCount,
      message: `Preparing recipe group ${index + 1} of ${selectedCount}`,
    };

    logBatchTelemetry("info", "group.started", {
      ...telemetryContext,
      groupKey: imageGroup.key,
      imageCount: imageGroup.imageKeys.length,
      index: index + 1,
      total: selectedCount,
    });

    const existingRecipe = await findRecipeBySourceImageGroupKey(
      imageGroup.key,
    );

    if (existingRecipe) {
      const cleanupWarning = await deleteSourceImages(
        imageGroup.key,
        imageGroup.imageKeys,
        "Recipe already existed, but failed to delete source images",
        telemetryContext,
      );
      const baseMessage = createExistingRecipeMessage(
        existingRecipe.recipe.title,
        existingRecipe.id,
      );

      logBatchTelemetry("info", "group.existing.completed", {
        ...telemetryContext,
        groupKey: imageGroup.key,
        imageCount: imageGroup.imageKeys.length,
        recipeId: existingRecipe.id,
        recipeTitle: existingRecipe.recipe.title,
      });

      successCount += 1;

      yield {
        type: "result",
        result: {
          key: imageGroup.key,
          status: "success",
          imageCount: imageGroup.imageKeys.length,
          recipeId: existingRecipe.id,
          recipeTitle: existingRecipe.recipe.title,
          message: cleanupWarning
            ? `${baseMessage} ${cleanupWarning}`
            : baseMessage,
        },
      };

      continue;
    }

    let files: File[];
    const downloadStartedAt = Date.now();

    try {
      files = await Promise.all(
        imageGroup.imageKeys.map((imageKey) => downloadImageAsFile(imageKey)),
      );
    } catch (error) {
      const publicError = getPublicError(
        error,
        "Failed to process recipe images",
      );

      logBatchTelemetry("error", "group.download.failed", {
        ...telemetryContext,
        groupKey: imageGroup.key,
        imageCount: imageGroup.imageKeys.length,
        durationMs: Date.now() - downloadStartedAt,
        errorCode: isAppError(error) ? error.code : undefined,
        errorMessage: publicError.message,
      });

      errorCount += 1;

      yield {
        type: "result",
        result: createBatchProcessErrorResult(
          imageGroup,
          "downloading source images",
          error,
        ),
      };

      continue;
    }

    logBatchTelemetry("info", "group.download.completed", {
      ...telemetryContext,
      groupKey: imageGroup.key,
      imageCount: imageGroup.imageKeys.length,
      durationMs: Date.now() - downloadStartedAt,
    });

    let ocrSegments: string[];
    const ocrStartedAt = Date.now();

    try {
      ocrSegments = await extractOcrSegmentsFromImages(files);
    } catch (error) {
      const publicError = getPublicError(
        error,
        "Failed to process recipe images",
      );

      logBatchTelemetry("error", "group.ocr.failed", {
        ...telemetryContext,
        groupKey: imageGroup.key,
        imageCount: imageGroup.imageKeys.length,
        durationMs: Date.now() - ocrStartedAt,
        errorCode: isAppError(error) ? error.code : undefined,
        errorMessage: publicError.message,
      });

      errorCount += 1;

      yield {
        type: "result",
        result: createBatchProcessErrorResult(
          imageGroup,
          "extracting OCR text",
          error,
        ),
      };

      continue;
    }

    logBatchTelemetry("info", "group.ocr.completed", {
      ...telemetryContext,
      groupKey: imageGroup.key,
      imageCount: imageGroup.imageKeys.length,
      ocrSegmentCount: ocrSegments.length,
      durationMs: Date.now() - ocrStartedAt,
    });

    pendingRecipeBatch.push({
      key: imageGroup.key,
      imageKeys: imageGroup.imageKeys,
      imageCount: imageGroup.imageKeys.length,
      ocrSegments,
    });

    if (pendingRecipeBatch.length < MAX_RECIPES_PER_LLM_BATCH) {
      continue;
    }

    for (const result of await flushPendingRecipeBatch(
      pendingRecipeBatch.splice(0, pendingRecipeBatch.length),
      telemetryContext,
    )) {
      if (result.status === "success") {
        successCount += 1;
      } else {
        errorCount += 1;
      }

      yield {
        type: "result",
        result,
      };
    }
  }

  for (const result of await flushPendingRecipeBatch(
    pendingRecipeBatch.splice(0, pendingRecipeBatch.length),
    telemetryContext,
  )) {
    if (result.status === "success") {
      successCount += 1;
    } else {
      errorCount += 1;
    }

    yield {
      type: "result",
      result,
    };
  }

  logBatchTelemetry("info", "run.completed", {
    ...telemetryContext,
    pendingRecipeCount,
    selectedCount,
    successCount,
    errorCount,
    durationMs: Date.now() - runStartedAt,
  });
}
