import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
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
  generateStructuredRecipeJsonText: mocks.generateStructuredRecipeJsonText,
}));

import { recipeFromOcrText } from "./extract";

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
});
