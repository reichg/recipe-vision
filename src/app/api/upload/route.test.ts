import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/server/shared/errors";

const mocks = vi.hoisted(() => ({
  getImageFilesFromFormData: vi.fn(),
  uploadAndProcessImages: vi.fn(),
}));

vi.mock("@/server/service/batch-processing", () => ({
  uploadAndProcessImages: mocks.uploadAndProcessImages,
}));

vi.mock("@/server/service/s3-validation", () => ({
  getImageFilesFromFormData: mocks.getImageFilesFromFormData,
}));

import { POST } from "./route";

function createUploadRequest() {
  const formData = new FormData();

  formData.append(
    "images",
    new File([new Uint8Array([1, 2, 3])], "recipe.jpg", {
      type: "image/jpeg",
    }),
  );

  return new NextRequest("http://localhost/api/upload", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/upload", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the processed recipe payload for a successful upload", async () => {
    const files = [
      new File([new Uint8Array([1, 2, 3])], "recipe.jpg", {
        type: "image/jpeg",
      }),
    ];
    const payload = {
      success: true,
      groupKey: "images/un-processed/group-1/",
      uploads: [
        {
          key: "images/un-processed/group-1/01-recipe.jpg",
          url: "https://example.com/1",
        },
      ],
      message: "Uploaded 1 image and processed the recipe successfully",
      processing: {
        status: "completed" as const,
        recipeId: "recipe_123",
        recipe: {
          title: "Tomato Soup",
          ingredients: [{ name: "Tomatoes" }],
          steps: ["Simmer the tomatoes."],
          sourceText: "combined text",
        },
      },
    };

    mocks.getImageFilesFromFormData.mockReturnValue(files);
    mocks.uploadAndProcessImages.mockResolvedValue(payload);

    const response = await POST(createUploadRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(payload);
    expect(mocks.uploadAndProcessImages).toHaveBeenCalledWith(files);
  });

  it("keeps processing failures in the JSON payload without converting them to request errors", async () => {
    const files = [
      new File([new Uint8Array([1, 2, 3])], "recipe.jpg", {
        type: "image/jpeg",
      }),
    ];
    const payload = {
      success: true,
      groupKey: "images/un-processed/group-1/",
      uploads: [
        {
          key: "images/un-processed/group-1/01-recipe.jpg",
          url: "https://example.com/1",
        },
      ],
      message: "Uploaded 1 image, but automatic processing failed",
      processing: {
        status: "failed" as const,
        error:
          "Image did not contain readable recipe text. The uploaded images remain available for retry from batch processing.",
      },
    };

    mocks.getImageFilesFromFormData.mockReturnValue(files);
    mocks.uploadAndProcessImages.mockResolvedValue(payload);

    const response = await POST(createUploadRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(payload);
    expect(mocks.uploadAndProcessImages).toHaveBeenCalledWith(files);
  });

  it("returns a sanitized error response when upload processing throws", async () => {
    const files = [
      new File([new Uint8Array([1, 2, 3])], "recipe.jpg", {
        type: "image/jpeg",
      }),
    ];

    mocks.getImageFilesFromFormData.mockReturnValue(files);
    mocks.uploadAndProcessImages.mockRejectedValue(
      new AppError({
        code: "PROCESSING_FAILED",
        message: "Automatic processing failed",
        statusCode: 422,
      }),
    );

    const response = await POST(createUploadRequest());

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "Automatic processing failed",
    });
  });
});
