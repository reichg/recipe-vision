import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  hasRecipeMetrics,
  hasRecipeTagsOrAllergens,
  RecipeDetailContent,
} from "./page";

describe("recipe detail page guards", () => {
  it("hides optional sections when metrics are zero and metadata arrays are empty", () => {
    const markup = renderToStaticMarkup(
      createElement(RecipeDetailContent, {
        recipe: {
          id: "recipe-1",
          title: "Chopped Vegetable Salad",
          description: "Fresh vegetables with Dijon dressing.",
          servings: undefined,
          prepTimeMinutes: 0,
          cookTimeMinutes: 0,
          totalTimeMinutes: 0,
          ingredients: [
            {
              name: "cucumber",
              quantity: 1,
              unit: "medium",
            },
          ],
          steps: ["Mix and serve."],
          tags: [],
          allergens: [],
        },
      }),
    );

    expect(
      hasRecipeMetrics({
        id: "recipe-1",
        title: "Chopped Vegetable Salad",
        description: "Fresh vegetables with Dijon dressing.",
        servings: undefined,
        prepTimeMinutes: 0,
        cookTimeMinutes: 0,
        totalTimeMinutes: 0,
        ingredients: [{ name: "cucumber", quantity: 1, unit: "medium" }],
        steps: ["Mix and serve."],
        tags: [],
        allergens: [],
      }),
    ).toBe(false);
    expect(
      hasRecipeTagsOrAllergens({
        id: "recipe-1",
        title: "Chopped Vegetable Salad",
        description: "Fresh vegetables with Dijon dressing.",
        servings: undefined,
        prepTimeMinutes: 0,
        cookTimeMinutes: 0,
        totalTimeMinutes: 0,
        ingredients: [{ name: "cucumber", quantity: 1, unit: "medium" }],
        steps: ["Mix and serve."],
        tags: [],
        allergens: [],
      }),
    ).toBe(false);
    expect(markup).not.toContain("Tags");
    expect(markup).not.toContain("Allergens");
    expect(markup).not.toContain("Prep Time");
    expect(markup).not.toContain("Cook Time");
    expect(markup).not.toContain("Total Time");
    expect(markup).not.toMatch(/>0</);
  });

  it("does not leak zero text nodes when some metrics render and others are zero", () => {
    const markup = renderToStaticMarkup(
      createElement(RecipeDetailContent, {
        recipe: {
          id: "recipe-2",
          title: "Warm Lentil Bowl",
          ingredients: [
            {
              name: "lentils",
              quantity: 0,
              unit: "cups",
            },
          ],
          steps: ["Simmer until tender."],
          prepTimeMinutes: 0,
          totalTimeMinutes: 15,
          tags: [],
          allergens: [],
        },
      }),
    );

    expect(markup).toContain("Total Time");
    expect(markup).toContain("15 min");
    expect(markup).not.toContain("Prep Time");
    expect(markup).not.toMatch(/>0</);
  });
});
