import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError, getPublicError } from "./errors";

function serializeUnknownError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return { error };
}

export function createErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof ZodError) {
    logger.warn("Request validation failed", {
      issues: error.issues.map(({ message, path }) => ({ message, path })),
    });
  } else if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error(error.message, {
        code: error.code,
        cause: serializeUnknownError(error.cause),
      });
    }
  } else {
    logger.error(fallbackMessage, serializeUnknownError(error));
  }

  const { message, statusCode } = getPublicError(error, fallbackMessage);

  return NextResponse.json({ error: message }, { status: statusCode });
}
