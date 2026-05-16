import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/server/shared/errors";

const mocks = vi.hoisted(() => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  createRecipeFromImages: vi.fn(),
  deleteImages: vi.fn(),
  downloadImageAsFile: vi.fn(),
  findRecipeBySourceImageGroupKey: vi.fn(),
  listProcessableImageGroups: vi.fn(),
  uploadImages: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: mocks.logger,
}));

vi.mock("@/server/service/recipes", () => ({
  createRecipeFromImages: mocks.createRecipeFromImages,
  findRecipeBySourceImageGroupKey: mocks.findRecipeBySourceImageGroupKey,
}));

vi.mock("@/server/service/s3", () => ({
  deleteImages: mocks.deleteImages,
  downloadImageAsFile: mocks.downloadImageAsFile,
  listProcessableImageGroups: mocks.listProcessableImageGroups,
  uploadImages: mocks.uploadImages,
}));

import {
  processRecipeBatch,
  uploadAndProcessImages,
  type BatchProcessEvent,
} from "./batch-processing";

async function collectEvents(prefix: string): Promise<BatchProcessEvent[]> {
  const events: BatchProcessEvent[] = [];

  for await (const event of processRecipeBatch(prefix)) {
    events.push(event);
  }

  return events;
}

describe("processRecipeBatch", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("yields one success result for each grouped recipe upload", async () => {
    const firstFile = new File([new Uint8Array([1, 2, 3])], "recipe-1.jpg", {
      type: "image/jpeg",
    });
    const secondFile = new File([new Uint8Array([4, 5, 6])], "recipe-2.jpg", {
      type: "image/jpeg",
    });

    mocks.listProcessableImageGroups.mockResolvedValue([
      {
        key: "images/un-processed/group-1/",
        imageKeys: [
          "images/un-processed/group-1/01-recipe-1.jpg",
          "images/un-processed/group-1/02-recipe-2.jpg",
        ],
      },
    ]);
    mocks.downloadImageAsFile
      .mockResolvedValueOnce(firstFile)
      .mockResolvedValueOnce(secondFile);
    mocks.findRecipeBySourceImageGroupKey.mockResolvedValue(null);
    mocks.createRecipeFromImages.mockResolvedValue({ id: "recipe_123" });
    mocks.deleteImages.mockResolvedValue(undefined);

    await expect(collectEvents("images/un-processed/")).resolves.toEqual([
      { type: "total", count: 1 },
      { type: "progress", key: "images/un-processed/group-1/" },
      {
        type: "result",
        result: {
          key: "images/un-processed/group-1/",
          status: "success",
          recipeId: "recipe_123",
        },
      },
    ]);

    expect(mocks.listProcessableImageGroups).toHaveBeenCalledWith(
      "images/un-processed/",
    );
    expect(mocks.createRecipeFromImages).toHaveBeenCalledWith(
      [firstFile, secondFile],
      {
        sourceImageGroupKey: "images/un-processed/group-1/",
      },
    );
    expect(mocks.deleteImages).toHaveBeenCalledWith([
      "images/un-processed/group-1/01-recipe-1.jpg",
      "images/un-processed/group-1/02-recipe-2.jpg",
    ]);
  });

  it("continues processing after per-group failures and skips deletion for failed saves", async () => {
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

    mocks.createRecipeFromImages
      .mockRejectedValueOnce(
        new AppError({
          code: "OCR_EMPTY_TEXT",
          message: "Image did not contain readable recipe text",
          statusCode: 422,
        }),
      )
      .mockResolvedValueOnce({ id: "recipe_456" });

    mocks.deleteImages.mockResolvedValue(undefined);

    await expect(collectEvents("images/un-processed/")).resolves.toEqual([
      { type: "total", count: 2 },
      { type: "progress", key: "images/un-processed/group-1/" },
      {
        type: "result",
        result: {
          key: "images/un-processed/group-1/",
          status: "error",
          error: "Image did not contain readable recipe text",
        },
      },
      { type: "progress", key: "images/un-processed/group-2/" },
      {
        type: "result",
        result: {
          key: "images/un-processed/group-2/",
          status: "success",
          recipeId: "recipe_456",
        },
      },
    ]);

    expect(mocks.deleteImages).toHaveBeenCalledTimes(1);
    expect(mocks.deleteImages).toHaveBeenCalledWith([
      "images/un-processed/group-2/01-second.jpg",
    ]);
  });

  it("reports cleanup failures without marking the saved recipe as failed", async () => {
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
    mocks.createRecipeFromImages.mockResolvedValue({ id: "recipe_789" });
    mocks.deleteImages.mockRejectedValue(
      new AppError({
        code: "S3_DELETE_FAILED",
        message: "Failed to delete source images",
        statusCode: 502,
      }),
    );

    await expect(collectEvents("images/un-processed/")).resolves.toEqual([
      { type: "total", count: 1 },
      { type: "progress", key: "images/un-processed/group-1/" },
      {
        type: "result",
        result: {
          key: "images/un-processed/group-1/",
          status: "success",
          recipeId: "recipe_789",
          error:
            "Recipe saved, but failed to delete source images: Failed to delete source images",
        },
      },
    ]);
  });

  it("reuses the existing recipe id when cleanup failed on an earlier run", async () => {
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

    await expect(collectEvents("images/un-processed/")).resolves.toEqual([
      { type: "total", count: 1 },
      { type: "progress", key: "images/un-processed/group-1/" },
      {
        type: "result",
        result: {
          key: "images/un-processed/group-1/",
          status: "success",
          recipeId: "recipe_existing",
        },
      },
    ]);

    expect(mocks.downloadImageAsFile).not.toHaveBeenCalled();
    expect(mocks.createRecipeFromImages).not.toHaveBeenCalled();
    expect(mocks.deleteImages).toHaveBeenCalledWith([
      "images/un-processed/group-1/01-recipe-1.jpg",
      "images/un-processed/group-1/02-recipe-2.jpg",
    ]);
  });

  it("uploads a new image group and processes it immediately", async () => {
    const firstFile = new File([new Uint8Array([1, 2, 3])], "recipe-1.jpg", {
      type: "image/jpeg",
    });
    const secondFile = new File([new Uint8Array([4, 5, 6])], "recipe-2.jpg", {
      type: "image/jpeg",
    });
    const recipe = {
      title: "Tomato Soup",
      ingredients: [{ name: "Tomatoes" }],
      steps: ["Simmer the tomatoes."],
      sourceText: "combined text",
    };

    mocks.uploadImages.mockResolvedValue({
      success: true,
      groupKey: "images/un-processed/group-1/",
      uploads: [
        {
          key: "images/un-processed/group-1/01-recipe-1.jpg",
          url: "https://example.com/1",
        },
        {
          key: "images/un-processed/group-1/02-recipe-2.jpg",
          url: "https://example.com/2",
        },
      ],
      message: "Uploaded 2 images successfully",
    });
    mocks.findRecipeBySourceImageGroupKey.mockResolvedValue(null);
    mocks.downloadImageAsFile
      .mockResolvedValueOnce(firstFile)
      .mockResolvedValueOnce(secondFile);
    mocks.createRecipeFromImages.mockResolvedValue({
      id: "recipe_123",
      recipe,
    });
    mocks.deleteImages.mockResolvedValue(undefined);

    await expect(
      uploadAndProcessImages([firstFile, secondFile]),
    ).resolves.toEqual({
      success: true,
      groupKey: "images/un-processed/group-1/",
      uploads: [
        {
          key: "images/un-processed/group-1/01-recipe-1.jpg",
          url: "https://example.com/1",
        },
        {
          key: "images/un-processed/group-1/02-recipe-2.jpg",
          url: "https://example.com/2",
        },
      ],
      message: "Uploaded 2 images and processed the recipe successfully",
      processing: {
        status: "completed",
        recipeId: "recipe_123",
        recipe,
      },
    });

    expect(mocks.uploadImages).toHaveBeenCalledWith([firstFile, secondFile]);
    expect(mocks.downloadImageAsFile).toHaveBeenNthCalledWith(
      1,
      "images/un-processed/group-1/01-recipe-1.jpg",
    );
    expect(mocks.downloadImageAsFile).toHaveBeenNthCalledWith(
      2,
      "images/un-processed/group-1/02-recipe-2.jpg",
    );
  });

  it("returns a retryable processing failure when upload succeeds but parsing fails", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "recipe.jpg", {
      type: "image/jpeg",
    });

    mocks.uploadImages.mockResolvedValue({
      success: true,
      groupKey: "images/un-processed/group-1/",
      uploads: [
        {
          key: "images/un-processed/group-1/01-recipe.jpg",
          url: "https://example.com/1",
        },
      ],
      message: "Uploaded 1 image successfully",
    });
    mocks.findRecipeBySourceImageGroupKey.mockResolvedValue(null);
    mocks.downloadImageAsFile.mockResolvedValue(file);
    mocks.createRecipeFromImages.mockRejectedValue(
      new AppError({
        code: "OCR_EMPTY_TEXT",
        message: "Image did not contain readable recipe text",
        statusCode: 422,
      }),
    );

    await expect(uploadAndProcessImages([file])).resolves.toEqual({
      success: true,
      groupKey: "images/un-processed/group-1/",
      uploads: [
        {
          key: "images/un-processed/group-1/01-recipe.jpg",
          url: "https://example.com/1",
        },
      ],
      message: "Uploaded 1 image, but automatic processing failed",
      processing: {
        status: "failed",
        error:
          "Image did not contain readable recipe text. The uploaded images remain available for retry from batch processing.",
      },
    });

    expect(mocks.deleteImages).not.toHaveBeenCalled();
  });
});
