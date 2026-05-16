import { NextRequest, NextResponse } from "next/server";

import {
  createRecipeFromImages,
  deleteRecipesByIds,
  listRecipes,
} from "@/server/service/recipes";
import {
  recipeDeleteBodySchema,
  recipeListQuerySchema,
} from "@/server/service/recipes-validation";
import { getImageFilesFromFormData } from "@/server/service/s3-validation";
import { createErrorResponse } from "@/server/shared/http";

export async function GET(req: NextRequest) {
  try {
    const query = recipeListQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );

    return NextResponse.json(await listRecipes(query));
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch recipes");
  }
}

export const runtime = "nodejs"; // important for file/form handling stability

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = getImageFilesFromFormData(form);

    return NextResponse.json(await createRecipeFromImages(files));
  } catch (error) {
    return createErrorResponse(error, "Failed to parse recipe");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = recipeDeleteBodySchema.parse(await req.json());
    return NextResponse.json(await deleteRecipesByIds(body.ids));
  } catch (error) {
    return createErrorResponse(error, "Failed to delete recipes");
  }
}
