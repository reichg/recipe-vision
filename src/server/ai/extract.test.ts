import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateStructuredRecipeBatchJsonText: vi.fn(),
  generateStructuredRecipeJsonText: vi.fn(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: mocks.logger,
}));

vi.mock("./llm", () => ({
  generateStructuredRecipeBatchJsonText:
    mocks.generateStructuredRecipeBatchJsonText,
  generateStructuredRecipeJsonText: mocks.generateStructuredRecipeJsonText,
}));

import { recipeFromOcrText, recipesFromOcrTextGroups } from "./extract";

describe("recipeFromOcrText", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("builds extraction instructions and passes ordered OCR sections to the provider service", async () => {
    mocks.generateStructuredRecipeJsonText.mockResolvedValue(
      JSON.stringify({
        title: "Tomato Soup",
        ingredients: [{ name: "Tomatoes" }],
        steps: ["Simmer the tomatoes."],
      }),
    );

    const recipe = await recipeFromOcrText([
      "Title: Tomato Soup\nIngredients: Tomatoes",
      "Steps: Simmer the tomatoes.",
    ]);

    const request = mocks.generateStructuredRecipeJsonText.mock.calls[0]?.[0];

    expect(request?.instructionText).toContain(
      "Use recipe content from EVERY OCR photo part provided",
    );
    expect(request?.instructionText).toContain("Photos may be out of order");
    expect(request?.ocrSegments).toEqual([
      "Title: Tomato Soup\nIngredients: Tomatoes",
      "Steps: Simmer the tomatoes.",
    ]);
    expect(recipe.sourceText).toContain(
      "Recipe photo 1:\nTitle: Tomato Soup\nIngredients: Tomatoes",
    );
    expect(recipe.sourceText).toContain(
      "Recipe photo 2:\nSteps: Simmer the tomatoes.",
    );
  });

  it("rejects invalid structured JSON returned by the provider service", async () => {
    mocks.generateStructuredRecipeJsonText.mockResolvedValue("not-json");

    await expect(
      recipeFromOcrText(["Title: Tomato Soup\nIngredients: Tomatoes"]),
    ).rejects.toMatchObject({
      code: "LLM_INVALID_RESPONSE",
      statusCode: 502,
    });

    expect(mocks.generateStructuredRecipeJsonText).toHaveBeenCalledTimes(1);
  });

  it("maps a batched provider response back to the original recipe identifiers", async () => {
    mocks.generateStructuredRecipeBatchJsonText.mockResolvedValue(
      JSON.stringify({
        recipes: [
          {
            recipeId: "recipe-1",
            recipe: {
              title: "Tomato Soup",
              ingredients: [{ name: "Tomatoes" }],
              steps: ["Simmer the tomatoes."],
            },
          },
          {
            recipeId: "recipe-2",
            recipe: {
              title: "Grilled Cheese",
              ingredients: [{ name: "Bread" }],
              steps: ["Toast the sandwich."],
            },
          },
        ],
      }),
    );

    await expect(
      recipesFromOcrTextGroups([
        {
          recipeId: "recipe-1",
          ocrSegments: [
            "Title: Tomato Soup\nIngredients: Tomatoes",
            "Steps: Simmer the tomatoes.",
          ],
        },
        {
          recipeId: "recipe-2",
          ocrSegments: [
            "Title: Grilled Cheese\nIngredients: Bread",
            "Steps: Toast the sandwich.",
          ],
        },
      ]),
    ).resolves.toEqual([
      {
        recipeId: "recipe-1",
        recipe: {
          title: "Tomato Soup",
          ingredients: [{ name: "Tomatoes" }],
          steps: ["Simmer the tomatoes."],
          sourceText:
            "Recipe photo 1:\nTitle: Tomato Soup\nIngredients: Tomatoes\n\nRecipe photo 2:\nSteps: Simmer the tomatoes.",
        },
      },
      {
        recipeId: "recipe-2",
        recipe: {
          title: "Grilled Cheese",
          ingredients: [{ name: "Bread" }],
          steps: ["Toast the sandwich."],
          sourceText:
            "Recipe photo 1:\nTitle: Grilled Cheese\nIngredients: Bread\n\nRecipe photo 2:\nSteps: Toast the sandwich.",
        },
      },
    ]);

    const request =
      mocks.generateStructuredRecipeBatchJsonText.mock.calls[0]?.[0];

    expect(request?.instructionText).toContain(
      'Return exactly one item in "recipes" for each recipe identifier',
    );
    expect(request?.recipeInputs).toEqual([
      {
        recipeId: "recipe-1",
        ocrSegments: [
          "Title: Tomato Soup\nIngredients: Tomatoes",
          "Steps: Simmer the tomatoes.",
        ],
      },
      {
        recipeId: "recipe-2",
        ocrSegments: [
          "Title: Grilled Cheese\nIngredients: Bread",
          "Steps: Toast the sandwich.",
        ],
      },
    ]);
  });

  it("rejects a batched provider response with duplicate recipe identifiers", async () => {
    mocks.generateStructuredRecipeBatchJsonText.mockResolvedValue(
      JSON.stringify({
        recipes: [
          {
            recipeId: "recipe-1",
            recipe: {
              title: "Tomato Soup",
              ingredients: [{ name: "Tomatoes" }],
              steps: ["Simmer the tomatoes."],
            },
          },
          {
            recipeId: "recipe-1",
            recipe: {
              title: "Grilled Cheese",
              ingredients: [{ name: "Bread" }],
              steps: ["Toast the sandwich."],
            },
          },
        ],
      }),
    );

    await expect(
      recipesFromOcrTextGroups([
        {
          recipeId: "recipe-1",
          ocrSegments: ["Title: Tomato Soup"],
        },
        {
          recipeId: "recipe-2",
          ocrSegments: ["Title: Grilled Cheese"],
        },
      ]),
    ).rejects.toMatchObject({
      code: "LLM_INVALID_RESPONSE",
      statusCode: 502,
    });
  });
});
