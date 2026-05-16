import { Recipe } from "../../models/recipe";

export type RecipePayload = Omit<Recipe, "id">;

export type RecipeApiResponse = {
  id: string;
  recipe: RecipePayload;
  error?: string;
};

export type UploadApiResponse = {
  message?: string;
  error?: string;
  processing?:
    | {
        status: "completed";
        recipeId: string;
        recipe: RecipePayload;
        warning?: string;
      }
    | {
        status: "failed";
        error: string;
      };
};

export function toRecipeResult(id: string, recipe: RecipePayload): Recipe {
  return {
    ...recipe,
    id,
  };
}

export function getRecipeFromUploadResponse(
  response: UploadApiResponse,
): Recipe | null {
  if (!response.processing || response.processing.status === "failed") {
    return null;
  }

  return toRecipeResult(
    response.processing.recipeId,
    response.processing.recipe,
  );
}

export function getUploadProcessingError(
  response: UploadApiResponse,
): string | null {
  if (!response.processing) {
    return response.message ?? "Automatic processing failed after upload";
  }

  if (response.processing.status === "failed") {
    return response.processing.error;
  }

  return null;
}
