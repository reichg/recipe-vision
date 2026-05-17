import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";

import {
  getPendingRecipeGroupSummary,
  processRecipeBatch,
} from "@/server/service/batch-processing";
import {
  batchProcessBodySchema,
  batchProcessQuerySchema,
} from "@/server/service/batch-processing-validation";
import { getPublicError } from "@/server/shared/errors";
import { createErrorResponse } from "@/server/shared/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const query = batchProcessQuerySchema.parse({
      prefix: req.nextUrl.searchParams.get("prefix") ?? undefined,
    });

    return Response.json(await getPendingRecipeGroupSummary(query.prefix));
  } catch (error) {
    return createErrorResponse(
      error,
      "Failed to load batch processing summary",
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = batchProcessBodySchema.parse(await req.json());
    const encoder = new TextEncoder();
    const runId = randomUUID();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of processRecipeBatch(body.prefix, {
            limit: body.limit,
            runId,
          })) {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          }
        } catch (error) {
          const publicError = getPublicError(error, "Failed to process batch");

          controller.enqueue(
            encoder.encode(
              `${JSON.stringify({
                type: "error",
                error: publicError.message,
              })}\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return createErrorResponse(error, "Failed to start batch processing");
  }
}
