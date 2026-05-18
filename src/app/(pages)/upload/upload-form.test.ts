import { describe, expect, it } from "vitest";

import type { UploadGroupSelection } from "./upload-form";
import { buildUploadFormData, createInitialUploadGroups } from "./upload-form";

const LEGACY_OCR_UPLOAD_LIMIT_BYTES = 1024 * 1024;

function createUploadGroup(
  id: string,
  fileNames: string[],
): UploadGroupSelection {
  return {
    id,
    images: fileNames.map((fileName, index) => ({
      id: `${id}-${index + 1}`,
      file: new File([new Uint8Array([index + 1])], fileName, {
        type: "image/jpeg",
      }),
      previewUrl: `blob:${id}-${index + 1}`,
    })),
  };
}

describe("upload form helpers", () => {
  it("builds a grouped upload payload from non-empty upload groups", () => {
    const uploadGroups = [
      createUploadGroup("recipe-1", ["one.jpg", "two.jpg"]),
      createUploadGroup("recipe-empty", []),
      createUploadGroup("recipe-2", ["three.jpg"]),
    ];

    const result = buildUploadFormData(uploadGroups);
    const imageFiles = result.formData.getAll("images");
    const manifest = JSON.parse(
      String(result.formData.get("uploadGroups")),
    ) as Array<{ clientGroupId: string; fileIndexes: number[] }>;

    expect(result.groupCount).toBe(2);
    expect(result.imageCount).toBe(3);
    expect(imageFiles).toHaveLength(3);
    expect(imageFiles.map((value) => (value as File).name)).toEqual([
      "one.jpg",
      "two.jpg",
      "three.jpg",
    ]);
    expect(manifest).toEqual([
      { clientGroupId: "recipe-1", fileIndexes: [0, 1] },
      { clientGroupId: "recipe-2", fileIndexes: [2] },
    ]);
  });

  it("keeps files larger than the OCR provider cap in the client upload payload", () => {
    const largeFile = new File(
      [new Uint8Array(LEGACY_OCR_UPLOAD_LIMIT_BYTES + 1)],
      "large-recipe.jpg",
      { type: "image/jpeg" },
    );
    const uploadGroups: UploadGroupSelection[] = [
      {
        id: "recipe-1",
        images: [
          {
            id: "recipe-1-1",
            file: largeFile,
            previewUrl: "blob:recipe-1-1",
          },
        ],
      },
    ];

    const result = buildUploadFormData(uploadGroups);
    const imageFiles = result.formData.getAll("images") as File[];

    expect(imageFiles).toHaveLength(1);
    expect(imageFiles[0]?.name).toBe("large-recipe.jpg");
    expect(imageFiles[0]?.size).toBe(LEGACY_OCR_UPLOAD_LIMIT_BYTES + 1);
  });

  it("creates the initial upload-page state used after a successful reset", () => {
    const initialGroups = createInitialUploadGroups();

    expect(initialGroups).toHaveLength(1);
    expect(initialGroups[0]?.images).toEqual([]);
    expect(typeof initialGroups[0]?.id).toBe("string");
    expect(initialGroups[0]?.id.length).toBeGreaterThan(0);
  });
});
