import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/server/shared/errors";

const mocks = vi.hoisted(() => ({
  assertValidImageFiles: vi.fn(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  prismaCount: vi.fn(),
  prismaFindUnique: vi.fn(),
  prismaFindMany: vi.fn(),
  prismaQueryRaw: vi.fn(),
  ocrSpaceExtractText: vi.fn(),
  prismaCreate: vi.fn(),
  recipesFromOcrTextGroups: vi.fn(),
  recipeFromOcrText: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: mocks.logger,
}));

vi.mock("@/server/ai/extract", () => ({
  recipesFromOcrTextGroups: mocks.recipesFromOcrTextGroups,
  recipeFromOcrText: mocks.recipeFromOcrText,
}));

vi.mock("@/server/ai/ocr", () => ({
  ocrSpaceExtractText: mocks.ocrSpaceExtractText,
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $queryRaw: mocks.prismaQueryRaw,
    recipe: {
      count: mocks.prismaCount,
      create: mocks.prismaCreate,
      findMany: mocks.prismaFindMany,
      findUnique: mocks.prismaFindUnique,
    },
  },
}));

vi.mock("./s3-validation", () => ({
  assertValidImageFiles: mocks.assertValidImageFiles,
}));

import {
  createRecipeFromImages,
  extractRecipesFromOcrSegmentGroups,
  listRecipes,
} from "./recipes";

describe("listRecipes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated recipes without search via Prisma findMany/count", async () => {
    const recipes = [
      {
        id: "recipe_1",
        title: "Tomato Soup",
        createdAt: new Date("2026-05-01T12:00:00.000Z"),
        json: {
          title: "Tomato Soup",
          ingredients: [{ name: "Tomatoes" }],
          steps: ["Simmer."],
        },
      },
    ];

    mocks.prismaFindMany.mockResolvedValue(recipes);
    mocks.prismaCount.mockResolvedValue(3);

    await expect(listRecipes({ page: 1, limit: 2 })).resolves.toEqual({
      recipes,
      pagination: {
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      },
    });

    expect(mocks.prismaFindMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 2,
      select: { id: true, title: true, createdAt: true, json: true },
    });
    expect(mocks.prismaCount).toHaveBeenCalledTimes(1);
    expect(mocks.prismaQueryRaw).not.toHaveBeenCalled();
  });

  it("returns filtered pagination when searching title and ingredients", async () => {
    const recipes = [
      {
        id: "recipe_2",
        title: "Garlic Pasta",
        createdAt: new Date("2026-05-02T12:00:00.000Z"),
        json: {
          title: "Garlic Pasta",
          ingredients: [{ name: "Garlic" }],
          steps: ["Boil."],
        },
      },
    ];

    mocks.prismaQueryRaw
      .mockResolvedValueOnce(recipes)
      .mockResolvedValueOnce([{ total: 1 }]);

    await expect(
      listRecipes({ page: 2, limit: 1, query: "garlic" }),
    ).resolves.toEqual({
      recipes,
      pagination: {
        page: 2,
        limit: 1,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: true,
      },
    });

    expect(mocks.prismaQueryRaw).toHaveBeenCalledTimes(2);
    expect(mocks.prismaFindMany).not.toHaveBeenCalled();
    expect(mocks.prismaCount).not.toHaveBeenCalled();
  });
});

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

  it("stops before recipe extraction and persistence when OCR is rate limited", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "recipe-1.jpg", {
      type: "image/jpeg",
    });

    mocks.prismaFindUnique.mockResolvedValue(null);
    mocks.ocrSpaceExtractText.mockRejectedValue(
      new AppError({
        code: "OCR_RATE_LIMITED",
        message:
          "OCR service is temporarily rate limited. Please try again later.",
        statusCode: 503,
      }),
    );

    await expect(createRecipeFromImages([file])).rejects.toMatchObject({
      code: "OCR_RATE_LIMITED",
      statusCode: 503,
    });

    expect(mocks.recipeFromOcrText).not.toHaveBeenCalled();
    expect(mocks.prismaCreate).not.toHaveBeenCalled();
  });

  it("maps batched OCR groups back to their source image group keys", async () => {
    const firstRecipe = {
      title: "Tomato Soup",
      ingredients: [{ name: "Tomatoes" }],
      steps: ["Simmer the tomatoes."],
      sourceText: "combined text 1",
    };
    const secondRecipe = {
      title: "Grilled Cheese",
      ingredients: [{ name: "Bread" }],
      steps: ["Toast the sandwich."],
      sourceText: "combined text 2",
    };

    mocks.recipesFromOcrTextGroups.mockResolvedValue([
      { recipeId: "recipe-1", recipe: firstRecipe },
      { recipeId: "recipe-2", recipe: secondRecipe },
    ]);

    await expect(
      extractRecipesFromOcrSegmentGroups([
        {
          sourceImageGroupKey: "images/un-processed/group-1/",
          ocrSegments: ["Title: Tomato Soup"],
        },
        {
          sourceImageGroupKey: "images/un-processed/group-2/",
          ocrSegments: ["Title: Grilled Cheese"],
        },
      ]),
    ).resolves.toEqual([
      {
        sourceImageGroupKey: "images/un-processed/group-1/",
        recipe: firstRecipe,
      },
      {
        sourceImageGroupKey: "images/un-processed/group-2/",
        recipe: secondRecipe,
      },
    ]);

    expect(mocks.recipesFromOcrTextGroups).toHaveBeenCalledWith([
      {
        recipeId: "recipe-1",
        ocrSegments: ["Title: Tomato Soup"],
      },
      {
        recipeId: "recipe-2",
        ocrSegments: ["Title: Grilled Cheese"],
      },
    ]);
  });
});
