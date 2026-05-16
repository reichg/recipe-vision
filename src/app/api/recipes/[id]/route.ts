import { NextRequest, NextResponse } from "next/server";

import { deleteRecipeById, getRecipeById } from "@/server/service/recipes";
import { recipeParamsSchema } from "@/server/service/recipes-validation";
import { createErrorResponse } from "@/server/shared/http";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = recipeParamsSchema.parse(await context.params);
    return NextResponse.json({ recipe: await getRecipeById(id) });
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch recipe");
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = recipeParamsSchema.parse(await context.params);
    return NextResponse.json(await deleteRecipeById(id));
  } catch (error) {
    return createErrorResponse(error, "Failed to delete recipe");
  }
}
