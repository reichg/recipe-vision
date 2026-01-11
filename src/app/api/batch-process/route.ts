import { recipeFromOcrText } from "@/app/lib/ai/extract";
import { ocrSpaceExtractText } from "@/app/lib/ai/ocr";
import { logger } from "@/app/lib/logger";
import { prisma } from "@/app/lib/prisma";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { NextRequest } from "next/server";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const bucketName = process.env.AWS_S3_BUCKET || "";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await req.json();
        const prefix = body.prefix || "";

        logger.info("Starting batch processing", { prefix });

        // List all objects in the S3 bucket with the given prefix
        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
        });

        logger.info("Listing objects in S3", { bucket: bucketName, prefix });

        const listResponse = await s3Client.send(listCommand);
        const objects = listResponse.Contents || [];

        // Filter for image files
        const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
        const imageObjects = objects.filter((obj) =>
          imageExtensions.some((ext) => obj.Key?.toLowerCase().endsWith(ext))
        );

        logger.info("Found images", { count: imageObjects.length });

        // Send total count
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "total", count: imageObjects.length }) + "\n"
          )
        );

        // Process each image
        for (const obj of imageObjects) {
          if (!obj.Key) continue;

          try {
            // Send progress update
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: "progress", key: obj.Key }) + "\n"
              )
            );

            logger.info("Processing image", { key: obj.Key });

            // Download image from S3
            const getCommand = new GetObjectCommand({
              Bucket: bucketName,
              Key: obj.Key,
            });

            const s3Response = await s3Client.send(getCommand);
            const imageBuffer = await s3Response.Body?.transformToByteArray();

            if (!imageBuffer) {
              throw new Error("Failed to download image");
            }

            // Convert buffer to File object
            const blob = new Blob([new Uint8Array(imageBuffer)], {
              type: s3Response.ContentType || "image/jpeg",
            });
            const file = new File([blob], obj.Key.split("/").pop() || "image", {
              type: s3Response.ContentType || "image/jpeg",
            });

            // Process the image through OCR and recipe extraction
            const ocrText = await ocrSpaceExtractText(file);
            const recipe = await recipeFromOcrText(ocrText);

            // Save to database
            const saved = await prisma.recipe.create({
              data: {
                title: recipe.title,
                json: recipe,
              },
            });

            logger.info("Recipe saved", {
              key: obj.Key,
              recipeId: saved.id,
            });

            // Move file from un-processed to processed directory if applicable
            if (obj.Key.includes("un-processed")) {
              const processedKey = obj.Key.replace("un-processed", "processed");

              try {
                // Copy to processed directory
                const copyCommand = new CopyObjectCommand({
                  Bucket: bucketName,
                  CopySource: `${bucketName}/${obj.Key}`,
                  Key: processedKey,
                });
                await s3Client.send(copyCommand);

                // Delete from un-processed directory
                const deleteCommand = new DeleteObjectCommand({
                  Bucket: bucketName,
                  Key: obj.Key,
                });
                await s3Client.send(deleteCommand);

                logger.info("Moved file to processed directory", {
                  from: obj.Key,
                  to: processedKey,
                });
              } catch (moveError) {
                logger.error("Failed to move file", {
                  key: obj.Key,
                  error:
                    moveError instanceof Error
                      ? moveError.message
                      : "Unknown error",
                });
              }
            }

            // Send success result
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "result",
                  result: {
                    key: obj.Key,
                    status: "success",
                    recipeId: saved.id,
                  },
                }) + "\n"
              )
            );
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unknown error";
            logger.error("Failed to process image", {
              key: obj.Key,
              error: message,
            });

            // Send error result
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "result",
                  result: {
                    key: obj.Key,
                    status: "error",
                    error: message,
                  },
                }) + "\n"
              )
            );
          }
        }

        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("Batch processing error", { error: message });
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "error",
              error: message,
            }) + "\n"
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
