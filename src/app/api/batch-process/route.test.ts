import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPendingRecipeGroupSummary: vi.fn(),
  processRecipeBatch: vi.fn(),
}));

vi.mock("@/server/service/batch-processing", () => ({
  getPendingRecipeGroupSummary: mocks.getPendingRecipeGroupSummary,
  processRecipeBatch: mocks.processRecipeBatch,
}));

import { GET, POST } from "./route";

describe("batch process route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the pending recipe group summary", async () => {
    mocks.getPendingRecipeGroupSummary.mockResolvedValue({
      prefix: "images/un-processed/",
      pendingRecipeCount: 4,
      maxProcessLimit: 4,
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/batch-process?prefix=images/un-processed/",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      prefix: "images/un-processed/",
      pendingRecipeCount: 4,
      maxProcessLimit: 4,
    });
    expect(mocks.getPendingRecipeGroupSummary).toHaveBeenCalledWith(
      "images/un-processed/",
    );
  });

  it("streams batch-processing events using the requested limit", async () => {
    mocks.processRecipeBatch.mockImplementation(async function* () {
      yield { type: "total", count: 1 };
      yield {
        type: "progress",
        key: "images/un-processed/group-1/",
        index: 1,
        total: 1,
        message: "Preparing recipe group 1 of 1",
      };
      yield {
        type: "result",
        result: {
          key: "images/un-processed/group-1/",
          status: "success",
          imageCount: 1,
          recipeId: "recipe_123",
          recipeTitle: "Tomato Soup",
          message:
            'Extracted "Tomato Soup" from 1 image and saved it as recipe recipe_123.',
        },
      };
    });

    const response = await POST(
      new NextRequest("http://localhost/api/batch-process", {
        method: "POST",
        body: JSON.stringify({
          prefix: "images/un-processed/",
          limit: 1,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(200);

    const payloadLines = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    expect(payloadLines).toEqual([
      { type: "total", count: 1 },
      {
        type: "progress",
        key: "images/un-processed/group-1/",
        index: 1,
        total: 1,
        message: "Preparing recipe group 1 of 1",
      },
      {
        type: "result",
        result: {
          key: "images/un-processed/group-1/",
          status: "success",
          imageCount: 1,
          recipeId: "recipe_123",
          recipeTitle: "Tomato Soup",
          message:
            'Extracted "Tomato Soup" from 1 image and saved it as recipe recipe_123.',
        },
      },
    ]);
    expect(mocks.processRecipeBatch).toHaveBeenCalledWith(
      "images/un-processed/",
      expect.objectContaining({
        limit: 1,
      }),
    );
  });

  it("returns a validation error when the requested limit exceeds 10", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/batch-process", {
        method: "POST",
        body: JSON.stringify({
          prefix: "images/un-processed/",
          limit: 11,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Limit must be 10 or less",
    });
  });
});
