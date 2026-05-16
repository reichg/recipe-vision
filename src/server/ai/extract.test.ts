import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
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

vi.mock("@/server/config/env", () => ({
  getAiEnv: () => ({
    GEMINI_MODEL: "gemini-2.5-pro",
    GEMINI_TIMEOUT_MS: 1_000,
  }),
}));

vi.mock("./gemini", () => ({
  getGeminiClient: () => ({
    models: {
      generateContent: mocks.generateContent,
    },
  }),
}));

import { recipeFromOcrText } from "./extract";

describe("recipeFromOcrText", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sends ordered OCR sections for every uploaded recipe photo to Gemini", async () => {
    mocks.generateContent.mockResolvedValue({
      text: JSON.stringify({
        title: "Tomato Soup",
        ingredients: [{ name: "Tomatoes" }],
        steps: ["Simmer the tomatoes."],
      }),
    });

    const recipe = await recipeFromOcrText([
      "Title: Tomato Soup\nIngredients: Tomatoes",
      "Steps: Simmer the tomatoes.",
    ]);

    const request = mocks.generateContent.mock.calls[0]?.[0];
    const parts = request?.contents?.[0]?.parts;

    expect(parts).toHaveLength(3);
    expect(parts?.[0]?.text).toContain(
      "Use recipe content from EVERY OCR photo part provided",
    );
    expect(parts?.[0]?.text).toContain("Photos may be out of order");
    expect(parts?.[1]?.text).toContain("Recipe photo 1 OCR text:");
    expect(parts?.[1]?.text).toContain("Title: Tomato Soup");
    expect(parts?.[2]?.text).toContain("Recipe photo 2 OCR text:");
    expect(parts?.[2]?.text).toContain("Steps: Simmer the tomatoes.");
    expect(recipe.sourceText).toContain(
      "Recipe photo 1:\nTitle: Tomato Soup\nIngredients: Tomatoes",
    );
    expect(recipe.sourceText).toContain(
      "Recipe photo 2:\nSteps: Simmer the tomatoes.",
    );
  });
});
