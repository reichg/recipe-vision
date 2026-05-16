import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertValidImageFiles: vi.fn(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  prismaFindUnique: vi.fn(),
  ocrSpaceExtractText: vi.fn(),
  prismaCreate: vi.fn(),
  recipeFromOcrText: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: mocks.logger,
}));

vi.mock("@/server/ai/extract", () => ({
  recipeFromOcrText: mocks.recipeFromOcrText,
}));

vi.mock("@/server/ai/ocr", () => ({
  ocrSpaceExtractText: mocks.ocrSpaceExtractText,
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    recipe: {
      create: mocks.prismaCreate,
      findUnique: mocks.prismaFindUnique,
    },
  },
}));

vi.mock("./s3-validation", () => ({
  assertValidImageFiles: mocks.assertValidImageFiles,
}));

import { createRecipeFromImages } from "./recipes";

describe("createRecipeFromImages", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("combines OCR text from multiple images into one persisted recipe", async () => {
    const files = [
      new File([new Uint8Array([1, 2, 3])], "recipe-1.jpg", {
        type: "image/jpeg",
      }),
      new File([new Uint8Array([4, 5, 6])], "recipe-2.jpg", {
        type: "image/jpeg",
      }),
    ];

    const recipe = {
      title: "Tomato Soup",
      ingredients: [{ name: "Tomatoes" }],
      steps: ["Simmer the tomatoes."],
      sourceText: "combined text",
    };

    mocks.ocrSpaceExtractText
      .mockResolvedValueOnce("Title: Tomato Soup\nIngredients: Tomatoes")
      .mockResolvedValueOnce("Steps: Simmer the tomatoes.");
    mocks.prismaFindUnique.mockResolvedValue(null);
    mocks.recipeFromOcrText.mockResolvedValue(recipe);
    mocks.prismaCreate.mockResolvedValue({
      id: "recipe_123",
      json: recipe,
    });

    await expect(createRecipeFromImages(files)).resolves.toEqual({
      id: "recipe_123",
      recipe,
    });

    expect(mocks.assertValidImageFiles).toHaveBeenCalledTimes(1);
    expect(mocks.assertValidImageFiles).toHaveBeenCalledWith(files);
    expect(mocks.ocrSpaceExtractText).toHaveBeenCalledTimes(2);
    expect(mocks.ocrSpaceExtractText).toHaveBeenNthCalledWith(1, files[0]);
    expect(mocks.ocrSpaceExtractText).toHaveBeenNthCalledWith(2, files[1]);
    expect(mocks.prismaCreate).toHaveBeenCalledTimes(1);
    expect(mocks.recipeFromOcrText).toHaveBeenCalledWith([
      "Title: Tomato Soup\nIngredients: Tomatoes",
      "Steps: Simmer the tomatoes.",
    ]);
  });

  it("reuses an existing recipe when the source image group was already persisted", async () => {
    const existingRecipe = {
      title: "Tomato Soup",
      ingredients: [{ name: "Tomatoes" }],
      steps: ["Simmer the tomatoes."],
      sourceText: "combined text",
    };

    mocks.prismaFindUnique.mockResolvedValue({
      id: "recipe_existing",
      json: existingRecipe,
    });

    await expect(
      createRecipeFromImages(
        [
          new File([new Uint8Array([1, 2, 3])], "recipe-1.jpg", {
            type: "image/jpeg",
          }),
        ],
        { sourceImageGroupKey: "images/un-processed/group-1/" },
      ),
    ).resolves.toEqual({
      id: "recipe_existing",
      recipe: existingRecipe,
    });

    expect(mocks.prismaCreate).not.toHaveBeenCalled();
    expect(mocks.ocrSpaceExtractText).not.toHaveBeenCalled();
    expect(mocks.recipeFromOcrText).not.toHaveBeenCalled();
  });

  it("returns the persisted recipe when a concurrent create wins the unique source-image-group race", async () => {
    const recipe = {
      title: "Tomato Soup",
      ingredients: [{ name: "Tomatoes" }],
      steps: ["Simmer the tomatoes."],
      sourceText: "combined text",
    };
    const conflictError = Object.assign(
      new Error("Unique constraint failed on sourceImageGroupKey"),
      {
        code: "P2002",
        meta: { target: ["sourceImageGroupKey"] },
      },
    );

    mocks.prismaFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "recipe_existing",
      json: recipe,
    });
    mocks.ocrSpaceExtractText.mockResolvedValue(
      "Title: Tomato Soup\nIngredients: Tomatoes",
    );
    mocks.recipeFromOcrText.mockResolvedValue(recipe);
    mocks.prismaCreate.mockRejectedValue(conflictError);

    await expect(
      createRecipeFromImages(
        [
          new File([new Uint8Array([1, 2, 3])], "recipe-1.jpg", {
            type: "image/jpeg",
          }),
        ],
        { sourceImageGroupKey: "images/un-processed/group-1/" },
      ),
    ).resolves.toEqual({
      id: "recipe_existing",
      recipe,
    });

    expect(mocks.prismaCreate).toHaveBeenCalledTimes(1);
    expect(mocks.prismaFindUnique).toHaveBeenCalledTimes(2);
  });
});
