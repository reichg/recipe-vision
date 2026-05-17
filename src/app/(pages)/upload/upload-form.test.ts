import { describe, expect, it } from "vitest";

import type { UploadGroupSelection } from "./upload-form";
import { buildUploadFormData, createInitialUploadGroups } from "./upload-form";

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

  it("creates the initial upload-page state used after a successful reset", () => {
    const initialGroups = createInitialUploadGroups();

    expect(initialGroups).toHaveLength(1);
    expect(initialGroups[0]?.images).toEqual([]);
    expect(typeof initialGroups[0]?.id).toBe("string");
    expect(initialGroups[0]?.id.length).toBeGreaterThan(0);
  });
});
