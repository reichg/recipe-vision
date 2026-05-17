import { describe, expect, it } from "vitest";

import { getUploadSuccessMessage } from "./upload-response";

describe("upload response helpers", () => {
  it("returns the API success message when present", () => {
    expect(
      getUploadSuccessMessage({
        message: "Uploaded 1 image successfully",
        uploads: [
          {
            key: "images/un-processed/group-1/01-recipe.jpg",
            url: "https://example.com/1",
          },
        ],
      }),
    ).toBe("Uploaded 1 image successfully");
  });

  it("falls back to a message derived from the upload count", () => {
    expect(
      getUploadSuccessMessage({
        uploads: [
          {
            key: "images/un-processed/group-1/01-recipe.jpg",
            url: "https://example.com/1",
          },
          {
            key: "images/un-processed/group-1/02-recipe.jpg",
            url: "https://example.com/2",
          },
        ],
      }),
    ).toBe("Uploaded 2 images successfully");
    expect(getUploadSuccessMessage({})).toBe("Uploaded 0 images successfully");
  });

  it("builds a grouped-upload success message when the response includes recipe groups", () => {
    expect(
      getUploadSuccessMessage({
        groupCount: 2,
        totalImageCount: 3,
        groups: [
          {
            groupKey: "images/un-processed/group-1/",
            imageCount: 2,
            uploads: [
              {
                key: "images/un-processed/group-1/01-recipe.jpg",
                url: "https://example.com/1",
              },
              {
                key: "images/un-processed/group-1/02-recipe.jpg",
                url: "https://example.com/2",
              },
            ],
          },
          {
            groupKey: "images/un-processed/group-2/",
            imageCount: 1,
            uploads: [
              {
                key: "images/un-processed/group-2/01-recipe.jpg",
                url: "https://example.com/3",
              },
            ],
          },
        ],
      }),
    ).toBe("Uploaded 3 images across 2 recipe groups successfully");
  });
});
