import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { ocrSpaceExtractText } from "@/app/lib/ai/ocr";
import { recipeFromOcrText } from "@/app/lib/ai/extract";
import { logger } from "@/app/lib/logger";

export async function GET() {
  const recipes = await prisma.recipe.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, title: true, createdAt: true },
  });

  return NextResponse.json({ recipes });
}

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
    const saved = await prisma.recipe.create({
      data: {
        title: recipe.title,
        json: recipe,
      },
    });
    return NextResponse.json({ id: saved.id, recipe: saved.json });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
