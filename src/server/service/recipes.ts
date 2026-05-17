import { logger } from "@/lib/logger";
import { RecipeFromSchema } from "@/schemas/recipeSchema";
import {
  recipeFromOcrText,
  recipesFromOcrTextGroups,
} from "@/server/ai/extract";
import { ocrSpaceExtractText } from "@/server/ai/ocr";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/shared/errors";

import { assertValidImageFiles } from "./s3-validation";

type ListRecipesOptions = {
  page: number;
  limit: number;
};

type CreateRecipeFromImagesOptions = {
  sourceImageGroupKey?: string;
};

type ExtractRecipeFromOcrSegmentGroup = {
  sourceImageGroupKey: string;
  ocrSegments: string[];
};

type PersistRecipeOptions = {
  sourceImageGroupKey?: string;
};

type PrismaKnownRequestErrorLike = Error & {
  code?: unknown;
  meta?: {
    target?: unknown;
  };
};

function isSourceImageGroupKeyConflict(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const { code, meta } = error as PrismaKnownRequestErrorLike;

  if (code !== "P2002") {
    return false;
  }

  if (Array.isArray(meta?.target)) {
    return meta.target.includes("sourceImageGroupKey");
  }

  return meta?.target === "sourceImageGroupKey";
}

function logParsedRecipe(
  recipe: RecipeFromSchema,
  sourceImageCount: number,
  sourceImageGroupKey?: string,
) {
  logger.info("Recipe parsed successfully", {
    title: recipe.title,
    sourceImageCount,
    sourceImageGroupKey,
  });
}

export async function listRecipes({ page, limit }: ListRecipesOptions) {
  const skip = (page - 1) * limit;

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: { id: true, title: true, createdAt: true, json: true },
    }),
    prisma.recipe.count(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    recipes,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function findRecipeBySourceImageGroupKey(
  sourceImageGroupKey: string,
): Promise<{
  id: string;
  recipe: RecipeFromSchema;
} | null> {
  const recipe = await prisma.recipe.findUnique({
    where: { sourceImageGroupKey },
    select: { id: true, json: true },
  });

  if (!recipe) {
    return null;
  }

  return {
    id: recipe.id,
    recipe: recipe.json as RecipeFromSchema,
  };
}

export async function createRecipeFromImages(
  files: File[],
  options: CreateRecipeFromImagesOptions = {},
): Promise<{
  id: string;
  recipe: RecipeFromSchema;
}> {
  if (options.sourceImageGroupKey) {
    const existingRecipe = await findRecipeBySourceImageGroupKey(
      options.sourceImageGroupKey,
    );

    if (existingRecipe) {
      return existingRecipe;
    }
  }

  const ocrSegments = await extractOcrSegmentsFromImages(files);

  const recipe = await recipeFromOcrText(ocrSegments);

  logParsedRecipe(recipe, files.length, options.sourceImageGroupKey);

  return persistRecipe(recipe, options);
}

export async function extractOcrSegmentsFromImages(files: File[]) {
  assertValidImageFiles(files);

  const ocrSegments: string[] = [];

  for (const file of files) {
    ocrSegments.push(await ocrSpaceExtractText(file));
  }

  return ocrSegments;
}

export async function extractRecipesFromOcrSegmentGroups(
  groups: ExtractRecipeFromOcrSegmentGroup[],
): Promise<Array<{ sourceImageGroupKey: string; recipe: RecipeFromSchema }>> {
  if (groups.length === 0) {
    return [];
  }

  const batchRecipeInputs = groups.map(({ ocrSegments }, index) => ({
    recipeId: `recipe-${index + 1}`,
    ocrSegments,
  }));
  const recipesById = new Map(
    (await recipesFromOcrTextGroups(batchRecipeInputs)).map(
      ({ recipeId, recipe }) => [recipeId, recipe],
    ),
  );

  return groups.map(({ sourceImageGroupKey }, index) => {
    const recipeId = `recipe-${index + 1}`;
    const recipe = recipesById.get(recipeId);

    if (!recipe) {
      throw new AppError({
        code: "LLM_INVALID_RESPONSE",
        message: "Recipe extraction failed",
        statusCode: 502,
        cause: { recipeId, sourceImageGroupKey },
      });
    }

    return {
      sourceImageGroupKey,
      recipe,
    };
  });
}

export async function persistRecipe(
  recipe: RecipeFromSchema,
  options: PersistRecipeOptions = {},
): Promise<{
  id: string;
  recipe: RecipeFromSchema;
}> {
  let saved;

  try {
    saved = await prisma.recipe.create({
      data: {
        title: recipe.title,
        sourceImageGroupKey: options.sourceImageGroupKey ?? null,
        json: recipe,
      },
      select: {
        id: true,
        json: true,
      },
    });
  } catch (error) {
    if (options.sourceImageGroupKey && isSourceImageGroupKeyConflict(error)) {
      const existingRecipe = await findRecipeBySourceImageGroupKey(
        options.sourceImageGroupKey,
      );

      if (existingRecipe) {
        return existingRecipe;
      }
    }

    throw error;
  }

  return {
    id: saved.id,
    recipe: saved.json as RecipeFromSchema,
  };
}

export async function createRecipeFromImage(file: File): Promise<{
  id: string;
  recipe: RecipeFromSchema;
}> {
  return createRecipeFromImages([file]);
}

export async function getRecipeById(id: string): Promise<RecipeFromSchema> {
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { json: true },
  });

  if (!recipe) {
    throw new AppError({
      code: "RECIPE_NOT_FOUND",
      message: "Recipe not found",
      statusCode: 404,
    });
  }

  return recipe.json as RecipeFromSchema;
}

export async function deleteRecipeById(id: string) {
  const existingRecipe = await prisma.recipe.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingRecipe) {
    throw new AppError({
      code: "RECIPE_NOT_FOUND",
      message: "Recipe not found",
      statusCode: 404,
    });
  }

  await prisma.recipe.delete({ where: { id } });

  return {
    success: true,
    message: "Recipe deleted",
  };
}

export async function deleteRecipesByIds(ids: string[]) {
  const result = await prisma.recipe.deleteMany({
    where: {
      id: {
        in: ids,
      },
    },
  });

  return {
    success: true,
    deleted: result.count,
    message: `Deleted ${result.count} recipe(s)`,
  };
}
