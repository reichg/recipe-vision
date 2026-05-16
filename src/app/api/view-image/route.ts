import { NextRequest, NextResponse } from "next/server";

import { getSignedImageUrl } from "@/server/service/s3";
import { s3ObjectKeySchema } from "@/server/service/s3-validation";
import { createErrorResponse } from "@/server/shared/http";

export async function GET(req: NextRequest) {
  try {
    const key = s3ObjectKeySchema.parse(
      req.nextUrl.searchParams.get("key") || "",
    );
    const signedUrl = await getSignedImageUrl(key);

    return NextResponse.json({
      success: true,
      url: signedUrl,
    });
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch image from S3");
  }
}
