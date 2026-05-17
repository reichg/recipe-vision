export type UploadApiResponse = {
  success?: boolean;
  groupKey?: string;
  groupCount?: number;
  totalImageCount?: number;
  uploads?: Array<{
    key: string;
    url: string;
  }>;
  groups?: Array<{
    clientGroupId?: string;
    groupKey: string;
    imageCount?: number;
    uploads: Array<{
      key: string;
      url: string;
    }>;
    message?: string;
  }>;
  message?: string;
  error?: string;
};

export function getUploadSuccessMessage(response: UploadApiResponse): string {
  if (response.message) {
    return response.message;
  }

  if (response.groups?.length) {
    const groupCount = response.groupCount ?? response.groups.length;
    const imageCount =
      response.totalImageCount ??
      response.groups.reduce(
        (totalUploads, group) => totalUploads + group.uploads.length,
        0,
      );

    return `Uploaded ${imageCount} image${imageCount === 1 ? "" : "s"} across ${groupCount} recipe group${groupCount === 1 ? "" : "s"} successfully`;
  }

  const uploadCount = response.uploads?.length ?? 0;

  return `Uploaded ${uploadCount} image${uploadCount === 1 ? "" : "s"} successfully`;
}
