import { GoogleGenAI } from "@google/genai";

import { getAiEnv } from "@/server/config/env";
import { AppError } from "@/server/shared/errors";

let cachedClient: GoogleGenAI | undefined;
const GEMINI_RATE_LIMIT_MESSAGE_PATTERN =
  /(rate\s*limit|too many requests|quota|resource exhausted)/i;

type ErrorWithStatus = {
  message?: unknown;
  name?: unknown;
  status?: unknown;
};

export function getGeminiClient() {
  const { GEMINI_API_KEY } = getAiEnv();

  if (!GEMINI_API_KEY) {
    throw new AppError({
      code: "LLM_PROVIDER_NOT_CONFIGURED",
      message: "Recipe extraction failed",
      statusCode: 500,
      cause: {
        provider: "gemini",
      },
    });
  }

  cachedClient ??= new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  return cachedClient;
}

export function resetGeminiClient() {
  cachedClient = undefined;
}

export function isGeminiRateLimitError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const { message, name, status } = error as ErrorWithStatus;
  const normalizedMessage = typeof message === "string" ? message : "";
  const normalizedName = typeof name === "string" ? name : "";

  return (
    status === 429 ||
    normalizedName === "RateLimitError" ||
    GEMINI_RATE_LIMIT_MESSAGE_PATTERN.test(
      `${normalizedName} ${normalizedMessage}`,
    )
  );
}
