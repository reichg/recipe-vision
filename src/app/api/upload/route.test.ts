import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/server/shared/errors";

const mocks = vi.hoisted(() => ({
  getImageUploadGroupsFromFormData: vi.fn(),
  uploadImageGroups: vi.fn(),
  uploadImages: vi.fn(),
}));

vi.mock("@/server/service/s3", () => ({
  uploadImageGroups: mocks.uploadImageGroups,
  uploadImages: mocks.uploadImages,
}));

vi.mock("@/server/service/s3-validation", () => ({
  getImageUploadGroupsFromFormData: mocks.getImageUploadGroupsFromFormData,
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

  it("returns the upload payload for a successful upload", async () => {
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
      message: "Uploaded 1 image successfully",
    };

    mocks.getImageUploadGroupsFromFormData.mockReturnValue({
      groups: [{ clientGroupId: "group-1", files }],
      usedManifest: false,
    });
    mocks.uploadImages.mockResolvedValue(payload);

    const response = await POST(createUploadRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(payload);
    expect(mocks.uploadImages).toHaveBeenCalledWith(files);
    expect(mocks.uploadImageGroups).not.toHaveBeenCalled();
  });

  it("returns grouped upload payloads when the grouped upload manifest is present", async () => {
    const groupedFiles = [
      {
        clientGroupId: "recipe-1",
        files: [
          new File([new Uint8Array([1, 2, 3])], "recipe-1.jpg", {
            type: "image/jpeg",
          }),
        ],
      },
      {
        clientGroupId: "recipe-2",
        files: [
          new File([new Uint8Array([4, 5, 6])], "recipe-2.jpg", {
            type: "image/jpeg",
          }),
        ],
      },
    ];
    const payload = {
      success: true,
      groupCount: 2,
      totalImageCount: 2,
      groups: [
        {
          clientGroupId: "recipe-1",
          groupKey: "images/un-processed/group-1/",
          imageCount: 1,
          uploads: [
            {
              key: "images/un-processed/group-1/01-recipe-1.jpg",
              url: "https://example.com/1",
            },
          ],
          message: "Uploaded 1 image successfully",
        },
        {
          clientGroupId: "recipe-2",
          groupKey: "images/un-processed/group-2/",
          imageCount: 1,
          uploads: [
            {
              key: "images/un-processed/group-2/01-recipe-2.jpg",
              url: "https://example.com/2",
            },
          ],
          message: "Uploaded 1 image successfully",
        },
      ],
      message: "Uploaded 2 images across 2 recipe groups successfully",
    };

    mocks.getImageUploadGroupsFromFormData.mockReturnValue({
      groups: groupedFiles,
      usedManifest: true,
    });
    mocks.uploadImageGroups.mockResolvedValue(payload);

    const response = await POST(createUploadRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(payload);
    expect(mocks.uploadImageGroups).toHaveBeenCalledWith(groupedFiles);
    expect(mocks.uploadImages).not.toHaveBeenCalled();
  });

  it("returns a sanitized error response when upload processing throws", async () => {
    const files = [
      new File([new Uint8Array([1, 2, 3])], "recipe.jpg", {
        type: "image/jpeg",
      }),
    ];

    mocks.getImageUploadGroupsFromFormData.mockReturnValue({
      groups: [{ clientGroupId: "group-1", files }],
      usedManifest: false,
    });
    mocks.uploadImages.mockRejectedValue(
      new AppError({
        code: "UPLOAD_FAILED",
        message: "Upload failed",
        statusCode: 422,
      }),
    );

    const response = await POST(createUploadRequest());

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "Upload failed",
    });
  });
});
