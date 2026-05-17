import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/server/shared/errors";

const mocks = vi.hoisted(() => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  deleteImages: vi.fn(),
  downloadImageAsFile: vi.fn(),
  extractOcrSegmentsFromImages: vi.fn(),
  extractRecipesFromOcrSegmentGroups: vi.fn(),
  findRecipeBySourceImageGroupKey: vi.fn(),
  listProcessableImageGroups: vi.fn(),
  persistRecipe: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: mocks.logger,
}));

vi.mock("@/server/service/recipes", () => ({
  extractOcrSegmentsFromImages: mocks.extractOcrSegmentsFromImages,
  extractRecipesFromOcrSegmentGroups: mocks.extractRecipesFromOcrSegmentGroups,
  findRecipeBySourceImageGroupKey: mocks.findRecipeBySourceImageGroupKey,
  persistRecipe: mocks.persistRecipe,
}));

vi.mock("@/server/service/s3", () => ({
  deleteImages: mocks.deleteImages,
  downloadImageAsFile: mocks.downloadImageAsFile,
  listProcessableImageGroups: mocks.listProcessableImageGroups,
}));

import {
  getPendingRecipeGroupSummary,
  processRecipeBatch,
  type BatchProcessEvent,
} from "./batch-processing";

async function collectEvents(prefix: string, limit?: number) {
  const events: BatchProcessEvent[] = [];

  for await (const event of processRecipeBatch(prefix, { limit })) {
    events.push(event);
  }

  return events;
}

describe("batch processing service", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns the pending recipe group summary with the capped max process limit", async () => {
    mocks.listProcessableImageGroups.mockResolvedValue([
      { key: "images/un-processed/group-1/", imageKeys: ["group-1/01.jpg"] },
      { key: "images/un-processed/group-2/", imageKeys: ["group-2/01.jpg"] },
      { key: "images/un-processed/group-3/", imageKeys: ["group-3/01.jpg"] },
    ]);

    await expect(
      getPendingRecipeGroupSummary("images/un-processed/"),
    ).resolves.toEqual({
      prefix: "images/un-processed/",
      pendingRecipeCount: 3,
      maxProcessLimit: 3,
    });
  });

  it("batches multiple recipe groups into one extraction call and emits detailed success messages", async () => {
    const firstFile = new File([new Uint8Array([1, 2, 3])], "recipe-1.jpg", {
      type: "image/jpeg",
    });
    const secondFile = new File([new Uint8Array([4, 5, 6])], "recipe-2.jpg", {
      type: "image/jpeg",
    });

    mocks.listProcessableImageGroups.mockResolvedValue([
      {
        key: "images/un-processed/group-1/",
        imageKeys: ["images/un-processed/group-1/01-recipe-1.jpg"],
      },
      {
        key: "images/un-processed/group-2/",
        imageKeys: ["images/un-processed/group-2/01-recipe-2.jpg"],
      },
    ]);
    mocks.downloadImageAsFile
      .mockResolvedValueOnce(firstFile)
      .mockResolvedValueOnce(secondFile);
    mocks.findRecipeBySourceImageGroupKey.mockResolvedValue(null);
    mocks.extractOcrSegmentsFromImages
      .mockResolvedValueOnce(["Title: Tomato Soup"])
      .mockResolvedValueOnce(["Title: Grilled Cheese"]);
    mocks.extractRecipesFromOcrSegmentGroups.mockResolvedValue([
      {
        sourceImageGroupKey: "images/un-processed/group-1/",
        recipe: {
          title: "Tomato Soup",
          ingredients: [{ name: "Tomatoes" }],
          steps: ["Simmer the tomatoes."],
          sourceText: "combined text 1",
        },
      },
      {
        sourceImageGroupKey: "images/un-processed/group-2/",
        recipe: {
          title: "Grilled Cheese",
          ingredients: [{ name: "Bread" }],
          steps: ["Toast the sandwich."],
          sourceText: "combined text 2",
        },
      },
    ]);
    mocks.persistRecipe
      .mockResolvedValueOnce({ id: "recipe_123" })
      .mockResolvedValueOnce({ id: "recipe_456" });
    mocks.deleteImages.mockResolvedValue(undefined);

    await expect(collectEvents("images/un-processed/", 2)).resolves.toEqual([
      { type: "total", count: 2 },
      {
        type: "progress",
        key: "images/un-processed/group-1/",
        index: 1,
        total: 2,
        message: "Preparing recipe group 1 of 2",
      },
      {
        type: "progress",
        key: "images/un-processed/group-2/",
        index: 2,
        total: 2,
        message: "Preparing recipe group 2 of 2",
      },
      {
        type: "result",
        result: {
          key: "images/un-processed/group-1/",
          status: "success",
          imageCount: 1,
          recipeId: "recipe_123",
          recipeTitle: "Tomato Soup",
          message:
            'Extracted "Tomato Soup" from 1 image and saved it as recipe recipe_123.',
        },
      },
      {
        type: "result",
        result: {
          key: "images/un-processed/group-2/",
          status: "success",
          imageCount: 1,
          recipeId: "recipe_456",
          recipeTitle: "Grilled Cheese",
          message:
            'Extracted "Grilled Cheese" from 1 image and saved it as recipe recipe_456.',
        },
      },
    ]);

    expect(mocks.extractRecipesFromOcrSegmentGroups).toHaveBeenCalledTimes(1);
    expect(mocks.extractRecipesFromOcrSegmentGroups).toHaveBeenCalledWith([
      {
        sourceImageGroupKey: "images/un-processed/group-1/",
        ocrSegments: ["Title: Tomato Soup"],
      },
      {
        sourceImageGroupKey: "images/un-processed/group-2/",
        ocrSegments: ["Title: Grilled Cheese"],
      },
    ]);
    expect(mocks.logger.info).toHaveBeenCalledWith(
      "Batch processing telemetry",
      expect.objectContaining({
        flow: "batch-processing",
        step: "run.started",
        selectedCount: 2,
      }),
    );
    expect(mocks.logger.info).toHaveBeenCalledWith(
      "Batch processing telemetry",
      expect.objectContaining({
        flow: "batch-processing",
        step: "run.completed",
        successCount: 2,
        errorCount: 0,
      }),
    );
  });

  it("continues processing after per-group OCR failures and emits a detailed error message", async () => {
    const secondFile = new File([new Uint8Array([4, 5, 6])], "second.jpg", {
      type: "image/jpeg",
    });

    mocks.listProcessableImageGroups.mockResolvedValue([
      {
        key: "images/un-processed/group-1/",
        imageKeys: ["images/un-processed/group-1/01-first.jpg"],
      },
      {
        key: "images/un-processed/group-2/",
        imageKeys: ["images/un-processed/group-2/01-second.jpg"],
      },
    ]);
    mocks.downloadImageAsFile
      .mockResolvedValueOnce(
        new File([new Uint8Array([1])], "first.jpg", { type: "image/jpeg" }),
      )
      .mockResolvedValueOnce(secondFile);
    mocks.findRecipeBySourceImageGroupKey
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mocks.extractOcrSegmentsFromImages
      .mockRejectedValueOnce(
        new AppError({
          code: "OCR_EMPTY_TEXT",
          message: "Image did not contain readable recipe text",
          statusCode: 422,
        }),
      )
      .mockResolvedValueOnce(["Title: Second Recipe"]);
    mocks.extractRecipesFromOcrSegmentGroups.mockResolvedValue([
      {
        sourceImageGroupKey: "images/un-processed/group-2/",
        recipe: {
          title: "Second Recipe",
          ingredients: [{ name: "Ingredient" }],
          steps: ["Step."],
          sourceText: "combined text",
        },
      },
    ]);
    mocks.persistRecipe.mockResolvedValueOnce({ id: "recipe_456" });
    mocks.deleteImages.mockResolvedValue(undefined);

    await expect(collectEvents("images/un-processed/", 2)).resolves.toEqual([
      { type: "total", count: 2 },
      {
        type: "progress",
        key: "images/un-processed/group-1/",
        index: 1,
        total: 2,
        message: "Preparing recipe group 1 of 2",
      },
      {
        type: "result",
        result: {
          key: "images/un-processed/group-1/",
          status: "error",
          imageCount: 1,
          message:
            "Failed during extracting OCR text: Image did not contain readable recipe text",
        },
      },
      {
        type: "progress",
        key: "images/un-processed/group-2/",
        index: 2,
        total: 2,
        message: "Preparing recipe group 2 of 2",
      },
      {
        type: "result",
        result: {
          key: "images/un-processed/group-2/",
          status: "success",
          imageCount: 1,
          recipeId: "recipe_456",
          recipeTitle: "Second Recipe",
          message:
            'Extracted "Second Recipe" from 1 image and saved it as recipe recipe_456.',
        },
      },
    ]);
  });

  it("reports cleanup failures without marking the save as failed", async () => {
    mocks.listProcessableImageGroups.mockResolvedValue([
      {
        key: "images/un-processed/group-1/",
        imageKeys: ["images/un-processed/group-1/01-recipe.jpg"],
      },
    ]);
    mocks.downloadImageAsFile.mockResolvedValue(
      new File([new Uint8Array([1, 2, 3])], "recipe.jpg", {
        type: "image/jpeg",
      }),
    );
    mocks.findRecipeBySourceImageGroupKey.mockResolvedValue(null);
    mocks.extractOcrSegmentsFromImages.mockResolvedValue([
      "Title: Tomato Soup",
    ]);
    mocks.extractRecipesFromOcrSegmentGroups.mockResolvedValue([
      {
        sourceImageGroupKey: "images/un-processed/group-1/",
        recipe: {
          title: "Tomato Soup",
          ingredients: [{ name: "Tomatoes" }],
          steps: ["Simmer the tomatoes."],
          sourceText: "combined text",
        },
      },
    ]);
    mocks.persistRecipe.mockResolvedValue({ id: "recipe_789" });
    mocks.deleteImages.mockRejectedValue(
      new AppError({
        code: "S3_DELETE_FAILED",
        message: "Failed to delete source images",
        statusCode: 502,
      }),
    );

    await expect(collectEvents("images/un-processed/", 1)).resolves.toEqual([
      { type: "total", count: 1 },
      {
        type: "progress",
        key: "images/un-processed/group-1/",
        index: 1,
        total: 1,
        message: "Preparing recipe group 1 of 1",
      },
      {
        type: "result",
        result: {
          key: "images/un-processed/group-1/",
          status: "success",
          imageCount: 1,
          recipeId: "recipe_789",
          recipeTitle: "Tomato Soup",
          message:
            'Extracted "Tomato Soup" from 1 image and saved it as recipe recipe_789. Recipe saved, but failed to delete source images: Failed to delete source images',
        },
      },
    ]);
  });

  it("reuses the existing recipe id when source images were already processed", async () => {
    mocks.listProcessableImageGroups.mockResolvedValue([
      {
        key: "images/un-processed/group-1/",
        imageKeys: [
          "images/un-processed/group-1/01-recipe-1.jpg",
          "images/un-processed/group-1/02-recipe-2.jpg",
        ],
      },
    ]);
    mocks.findRecipeBySourceImageGroupKey.mockResolvedValue({
      id: "recipe_existing",
      recipe: {
        title: "Tomato Soup",
        ingredients: [{ name: "Tomatoes" }],
        steps: ["Simmer the tomatoes."],
        sourceText: "combined text",
      },
    });
    mocks.deleteImages.mockResolvedValue(undefined);

    await expect(collectEvents("images/un-processed/", 1)).resolves.toEqual([
      { type: "total", count: 1 },
      {
        type: "progress",
        key: "images/un-processed/group-1/",
        index: 1,
        total: 1,
        message: "Preparing recipe group 1 of 1",
      },
      {
        type: "result",
        result: {
          key: "images/un-processed/group-1/",
          status: "success",
          imageCount: 2,
          recipeId: "recipe_existing",
          recipeTitle: "Tomato Soup",
          message: 'Reused existing recipe "Tomato Soup" (recipe_existing).',
        },
      },
    ]);

    expect(mocks.downloadImageAsFile).not.toHaveBeenCalled();
    expect(mocks.extractOcrSegmentsFromImages).not.toHaveBeenCalled();
    expect(mocks.extractRecipesFromOcrSegmentGroups).not.toHaveBeenCalled();
  });

  it("limits one batch run to 10 recipe groups when more are pending", async () => {
    const imageGroups = Array.from({ length: 11 }, (_, index) => ({
      key: `images/un-processed/group-${index + 1}/`,
      imageKeys: [`images/un-processed/group-${index + 1}/01-recipe.jpg`],
    }));

    mocks.listProcessableImageGroups.mockResolvedValue(imageGroups);
    mocks.downloadImageAsFile.mockResolvedValue(
      new File([new Uint8Array([1, 2, 3])], "recipe.jpg", {
        type: "image/jpeg",
      }),
    );
    mocks.findRecipeBySourceImageGroupKey.mockResolvedValue(null);
    mocks.extractOcrSegmentsFromImages.mockResolvedValue(["Title: Recipe"]);
    mocks.extractRecipesFromOcrSegmentGroups.mockImplementation(
      async (groups: Array<{ sourceImageGroupKey: string }>) =>
        groups.map(({ sourceImageGroupKey }) => ({
          sourceImageGroupKey,
          recipe: {
            title: sourceImageGroupKey,
            ingredients: [{ name: "Ingredient" }],
            steps: ["Cook."],
            sourceText: sourceImageGroupKey,
          },
        })),
    );
    mocks.persistRecipe.mockImplementation(
      async (
        recipe: { title: string },
        options?: { sourceImageGroupKey?: string },
      ) => ({
        id: `saved-${options?.sourceImageGroupKey}`,
        recipe,
      }),
    );
    mocks.deleteImages.mockResolvedValue(undefined);

    const events = await collectEvents("images/un-processed/");

    expect(events[0]).toEqual({ type: "total", count: 10 });
    expect(events.filter((event) => event.type === "result")).toHaveLength(10);
    expect(mocks.extractRecipesFromOcrSegmentGroups).toHaveBeenCalledTimes(1);
    expect(
      mocks.extractRecipesFromOcrSegmentGroups.mock.calls[0]?.[0],
    ).toHaveLength(10);
  });
});
