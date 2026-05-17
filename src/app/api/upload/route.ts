import { NextRequest, NextResponse } from "next/server";

import { uploadImageGroups, uploadImages } from "@/server/service/s3";
import { getImageUploadGroupsFromFormData } from "@/server/service/s3-validation";
import { createErrorResponse } from "@/server/shared/http";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const uploadRequest = getImageUploadGroupsFromFormData(formData);

    if (uploadRequest.usedManifest) {
      return NextResponse.json(await uploadImageGroups(uploadRequest.groups));
    }

    return NextResponse.json(await uploadImages(uploadRequest.groups[0].files));
  } catch (error) {
    return createErrorResponse(error, "Failed to upload images");
  }
}
