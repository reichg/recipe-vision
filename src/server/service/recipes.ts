import { logger } from "@/lib/logger";
import { RecipeFromSchema } from "@/schemas/recipeSchema";
import {
  recipeFromOcrText,
  recipesFromOcrTextGroups,
} from "@/server/ai/extract";
import { ocrSpaceExtractText } from "@/server/ai/ocr";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/shared/errors";
import { Prisma } from "../../../generated/prisma/client";

import { assertValidImageFiles } from "./s3-validation";

type ListRecipesOptions = {
  page: number;
  limit: number;
  query?: string;
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

type RecipeListRecord = {
  id: string;
  title: string;
  createdAt: Date;
  json: RecipeFromSchema;
};

type RecipeCountRecord = {
  total: number;
};

const RECIPE_LIST_ORDER_BY = [
  { title: "asc" as const },
  { id: "asc" as const },
];

const RECIPE_LIST_ORDER_BY_SQL = Prisma.sql`
  ORDER BY r."title" ASC, r."id" ASC
`;

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function createPagination(page: number, limit: number, total: number) {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

function buildRecipeSearchWhere(searchPattern: string) {
  return Prisma.sql`
    WHERE (
      r."title" ILIKE ${searchPattern} ESCAPE '\\'
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(r."json"->'ingredients') = 'array'
              THEN r."json"->'ingredients'
            ELSE '[]'::jsonb
          END
        ) AS ingredient
        WHERE (
          COALESCE(ingredient->>'name', '') ILIKE ${searchPattern} ESCAPE '\\'
          OR COALESCE(ingredient->>'notes', '') ILIKE ${searchPattern} ESCAPE '\\'
        )
      )
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(r."json"->'tags') = 'array'
              THEN r."json"->'tags'
            ELSE '[]'::jsonb
          END
        ) AS tag(tag_value)
        WHERE tag.tag_value ILIKE ${searchPattern} ESCAPE '\\'
      )
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(r."json"->'steps') = 'array'
              THEN r."json"->'steps'
            ELSE '[]'::jsonb
          END
        ) AS step(step_value)
        WHERE step.step_value ILIKE ${searchPattern} ESCAPE '\\'
      )
    )
  `;
}

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

export async function listRecipes({ page, limit, query }: ListRecipesOptions) {
  const skip = (page - 1) * limit;

  if (query) {
    const searchPattern = `%${escapeLikePattern(query)}%`;
    const searchWhere = buildRecipeSearchWhere(searchPattern);

    const [recipes, countRows] = await Promise.all([
      prisma.$queryRaw<Array<RecipeListRecord>>(Prisma.sql`
        SELECT r."id", r."title", r."createdAt", r."json"
        FROM "Recipe" r
        ${searchWhere}
        ${RECIPE_LIST_ORDER_BY_SQL}
        OFFSET ${skip}
        LIMIT ${limit}
      `),
      prisma.$queryRaw<Array<RecipeCountRecord>>(Prisma.sql`
        SELECT COUNT(*)::int AS "total"
        FROM "Recipe" r
        ${searchWhere}
      `),
    ]);

    const total = countRows[0]?.total ?? 0;

    return {
      recipes,
      pagination: createPagination(page, limit, total),
    };
  }

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      orderBy: RECIPE_LIST_ORDER_BY,
      skip,
      take: limit,
      select: { id: true, title: true, createdAt: true, json: true },
    }),
    prisma.recipe.count(),
  ]);

  return {
    recipes,
    pagination: createPagination(page, limit, total),
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
