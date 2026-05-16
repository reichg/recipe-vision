import { describe, expect, it } from "vitest";

import {
  getRecipeFromUploadResponse,
  getUploadProcessingError,
  toRecipeResult,
} from "./upload-response";

describe("upload response helpers", () => {
  it("maps a processed upload response into the page recipe shape", () => {
    const recipe = {
      title: "Tomato Soup",
      ingredients: [{ name: "Tomatoes" }],
      steps: ["Simmer the tomatoes."],
      sourceText: "combined text",
    };

    expect(
      getRecipeFromUploadResponse({
        message: "Uploaded 1 image and processed the recipe successfully",
        processing: {
          status: "completed",
          recipeId: "recipe_123",
          recipe,
        },
      }),
    ).toEqual(toRecipeResult("recipe_123", recipe));
    expect(
      getUploadProcessingError({
        processing: {
          status: "completed",
          recipeId: "recipe_123",
          recipe,
        },
      }),
    ).toBeNull();
  });

  it("surfaces a retryable processing failure without returning a recipe", () => {
    const response = {
      message: "Uploaded 1 image, but automatic processing failed",
      processing: {
        status: "failed" as const,
        error:
          "Image did not contain readable recipe text. The uploaded images remain available for retry from batch processing.",
      },
    };

    expect(getRecipeFromUploadResponse(response)).toBeNull();
    expect(getUploadProcessingError(response)).toBe(
      "Image did not contain readable recipe text. The uploaded images remain available for retry from batch processing.",
    );
  });

  it("falls back to a generic error when processing metadata is missing", () => {
    expect(
      getRecipeFromUploadResponse({ message: "Upload completed" }),
    ).toBeNull();
    expect(getUploadProcessingError({ message: "Upload completed" })).toBe(
      "Upload completed",
    );
    expect(getUploadProcessingError({})).toBe(
      "Automatic processing failed after upload",
    );
  });
});
