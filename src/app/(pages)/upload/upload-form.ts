export const MAX_UPLOAD_IMAGE_SIZE_BYTES = 1024 * 1024;

export type UploadGroupImage = {
  id: string;
  file: File;
  previewUrl: string;
};

export type UploadGroupSelection = {
  id: string;
  images: UploadGroupImage[];
};

type UploadGroupManifestItem = {
  clientGroupId: string;
  fileIndexes: number[];
};

type BuildUploadFormDataResult = {
  formData: FormData;
  groupCount: number;
  imageCount: number;
};

export function createClientId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyUploadGroup(): UploadGroupSelection {
  return {
    id: createClientId(),
    images: [],
  };
}

export function createInitialUploadGroups(): UploadGroupSelection[] {
  return [createEmptyUploadGroup()];
}

export function getFilledUploadGroups(groups: UploadGroupSelection[]) {
  return groups.filter((group) => group.images.length > 0);
}

export function getTotalImageCount(groups: UploadGroupSelection[]) {
  return groups.reduce(
    (imageCount, group) => imageCount + group.images.length,
    0,
  );
}

export function getOversizedUploadFiles(files: File[]) {
  return files.filter((file) => file.size > MAX_UPLOAD_IMAGE_SIZE_BYTES);
}

export function buildUploadFormData(
  groups: UploadGroupSelection[],
): BuildUploadFormDataResult {
  const formData = new FormData();
  const filledGroups = getFilledUploadGroups(groups);
  const uploadGroups: UploadGroupManifestItem[] = [];
  let fileIndex = 0;

  for (const group of filledGroups) {
    const fileIndexes: number[] = [];

    for (const image of group.images) {
      formData.append("images", image.file);
      fileIndexes.push(fileIndex);
      fileIndex += 1;
    }

    uploadGroups.push({
      clientGroupId: group.id,
      fileIndexes,
    });
  }

  formData.append("uploadGroups", JSON.stringify(uploadGroups));

  return {
    formData,
    groupCount: filledGroups.length,
    imageCount: getTotalImageCount(filledGroups),
  };
}
