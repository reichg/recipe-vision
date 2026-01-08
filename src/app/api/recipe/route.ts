import { NextResponse } from "next/server";
import { ocrSpaceExtractText } from "@/app/ocrspace";
import { recipeFromOcrText } from "@/app/parseRecipe";
import { logger } from "@/app/utils/logger";

export const runtime = "nodejs"; // important for file/form handling stability

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing 'image' file field in multipart/form-data" },
        { status: 400 }
      );
    }

    // Basic guardrails
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Uploaded file must be an image" },
        { status: 400 }
      );
    }

    const ocrText = await ocrSpaceExtractText(file);
    const recipe = await recipeFromOcrText(ocrText);
    logger.info("Recipe parsed successfully", { title: recipe.title });
    return NextResponse.json({ recipe });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
