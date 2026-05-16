import { NextRequest, NextResponse } from "next/server";

import { uploadAndProcessImages } from "@/server/service/batch-processing";
import { getImageFilesFromFormData } from "@/server/service/s3-validation";
import { createErrorResponse } from "@/server/shared/http";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = getImageFilesFromFormData(formData);

    return NextResponse.json(await uploadAndProcessImages(files));
  } catch (error) {
    return createErrorResponse(error, "Failed to upload images");
  }
}
