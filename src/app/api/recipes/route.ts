import { recipeFromOcrText } from "@/app/lib/ai/extract";
import { ocrSpaceExtractText } from "@/app/lib/ai/ocr";
import { logger } from "@/app/lib/logger";
import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "12", 10);

  // Validate pagination params
  const validPage = Math.max(1, page);
  const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 per page
  const skip = (validPage - 1) * validLimit;

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: validLimit,
      select: { id: true, title: true, createdAt: true, json: true },
    }),
    prisma.recipe.count(),
  ]);

  const totalPages = Math.ceil(total / validLimit);

  return NextResponse.json({
    recipes,
    pagination: {
      page: validPage,
      limit: validLimit,
      total,
      totalPages,
      hasNext: validPage < totalPages,
      hasPrev: validPage > 1,
    },
  });
}

export const runtime = "nodejs"; // important for file/form handling stability

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing 'image' file field in multipart/form-data" },
        { status: 400 },
      );
    }

    // Basic guardrails
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Uploaded file must be an image" },
        { status: 400 },
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

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const ids = body.ids as string[];

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid 'ids' array" },
        { status: 400 },
      );
    }

    const result = await prisma.recipe.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `Deleted ${result.count} recipe(s)`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
