import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createRecipeFromImages: vi.fn(),
  deleteRecipesByIds: vi.fn(),
  listRecipes: vi.fn(),
}));

vi.mock("@/server/service/recipes", () => ({
  createRecipeFromImages: mocks.createRecipeFromImages,
  deleteRecipesByIds: mocks.deleteRecipesByIds,
  listRecipes: mocks.listRecipes,
}));

import { GET } from "./route";

describe("GET /api/recipes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("passes normalized query text to the recipes service", async () => {
    mocks.listRecipes.mockResolvedValue({
      recipes: [],
      pagination: {
        page: 2,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: true,
      },
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/recipes?page=2&limit=10&query=%20%20tomato%20%20soup%20%20",
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.listRecipes).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      query: "tomato soup",
    });
  });

  it("returns a validation error when the search query is too long", async () => {
    const response = await GET(
      new NextRequest(`http://localhost/api/recipes?query=${"a".repeat(121)}`),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Search query must be 120 characters or less",
    });
    expect(mocks.listRecipes).not.toHaveBeenCalled();
  });
});
