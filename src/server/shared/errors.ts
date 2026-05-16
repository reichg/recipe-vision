import { ZodError } from "zod";

type AppErrorOptions = {
  code: string;
  message: string;
  statusCode: number;
  cause?: unknown;
};

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly cause?: unknown;

  constructor({ code, message, statusCode, cause }: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.cause = cause;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getPublicError(
  error: unknown,
  fallbackMessage: string,
): { message: string; statusCode: number } {
  if (error instanceof ZodError) {
    return {
      message: error.issues[0]?.message ?? "Invalid request",
      statusCode: 400,
    };
  }

  if (isAppError(error)) {
    return {
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  return {
    message: fallbackMessage,
    statusCode: 500,
  };
}
