import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import RecipesPage, {
  buildRecipesRequestUrl,
  fetchRecipesPage,
  getNoRecipesMessage,
  getRealtimeSearchState,
  getRecipesRequestTransition,
  normalizeRecipeSearchInput,
} from "./page";

describe("recipes page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a labeled search control for filtering recipes", () => {
    const markup = renderToStaticMarkup(createElement(RecipesPage));

    expect(markup).toContain("Search recipes");
    expect(markup).toContain(
      "Search by title or ingredient. Results update as you type.",
    );
    expect(markup).toContain('type="search"');
    expect(markup).not.toContain('type="submit"');
  });

  it("builds request urls with a normalized active query", () => {
    expect(buildRecipesRequestUrl(2, "  garlic  ")).toBe(
      "/api/recipes?page=2&limit=25&query=garlic",
    );
  });

  it("fetches recipes with the active query and page", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        recipes: [
          {
            id: "recipe_1",
            json: {
              title: "Garlic Pasta",
              ingredients: [{ name: "Garlic" }],
              steps: ["Cook"],
            },
          },
        ],
        pagination: {
          page: 2,
          limit: 25,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: true,
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchRecipesPage(2, "garlic")).resolves.toEqual({
      recipes: [
        {
          id: "recipe_1",
          title: "Garlic Pasta",
          ingredients: [{ name: "Garlic" }],
          steps: ["Cook"],
        },
      ],
      pagination: {
        page: 2,
        limit: 25,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: true,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/recipes?page=2&limit=25&query=garlic",
    );
  });

  it("normalizes typed search text", () => {
    expect(normalizeRecipeSearchInput("  garlic   pasta  ")).toBe(
      "garlic pasta",
    );
  });

  it("resets real-time search to the first page", () => {
    expect(getRealtimeSearchState("  garlic  ")).toEqual({
      nextPage: 1,
      nextQuery: "garlic",
    });
  });

  it("does not start loading for normalized no-op search edits on page 1", () => {
    expect(getRecipesRequestTransition(1, "garlic", 1, " garlic  ")).toEqual({
      nextPage: 1,
      nextQuery: "garlic",
      shouldLoad: false,
    });
  });

  it("starts loading when a normalized search edit changes the query", () => {
    expect(getRecipesRequestTransition(1, "garlic", 1, "pasta")).toEqual({
      nextPage: 1,
      nextQuery: "pasta",
      shouldLoad: true,
    });
  });

  it("starts loading when a search edit resets pagination even if the query is unchanged", () => {
    expect(getRecipesRequestTransition(2, "garlic", 1, " garlic ")).toEqual({
      nextPage: 1,
      nextQuery: "garlic",
      shouldLoad: true,
    });
  });

  it("only starts loading for real page transitions", () => {
    expect(getRecipesRequestTransition(2, "garlic", 2, "garlic")).toEqual({
      nextPage: 2,
      nextQuery: "garlic",
      shouldLoad: false,
    });
    expect(getRecipesRequestTransition(2, "garlic", 3, "garlic")).toEqual({
      nextPage: 3,
      nextQuery: "garlic",
      shouldLoad: true,
    });
  });

  it("returns query-specific empty-state copy", () => {
    expect(getNoRecipesMessage("")).toBe("No recipes found.");
    expect(getNoRecipesMessage("garlic")).toBe(
      'No recipes match "garlic". Try a different title or ingredient.',
    );
  });
});
