import { z } from "zod";

import { logger } from "@/lib/logger";
import {
  getAiEnv,
  type LlmModelCandidate,
  type LlmProviderName,
} from "@/server/config/env";
import { AppError, isAppError } from "@/server/shared/errors";
import { createRateLimitTelemetry } from "@/server/shared/http";
import { withTimeout } from "@/server/shared/timeout";

import { getGeminiClient, isGeminiRateLimitError } from "./gemini";

type StructuredRecipeJsonRequest = {
  instructionText: string;
  ocrSegments: string[];
};

type OpenAiCompatibleProvider = Exclude<LlmProviderName, "gemini">;

const OPENAI_COMPATIBLE_ENDPOINTS: Record<OpenAiCompatibleProvider, string> = {
  mistral: "https://api.mistral.ai/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  cerebras: "https://api.cerebras.ai/v1/chat/completions",
};

const OPENAI_COMPATIBLE_RESPONSE_SCHEMA = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z
            .union([
              z.string(),
              z.array(
                z.object({
                  text: z.string().optional(),
                  type: z.string().optional(),
                }),
              ),
            ])
            .nullable()
            .optional(),
        }),
      }),
    )
    .min(1),
});

const OPENAI_COMPATIBLE_ERROR_SCHEMA = z.object({
  error: z
    .object({
      code: z.union([z.string(), z.number()]).optional(),
      message: z.string().optional(),
      type: z.string().optional(),
    })
    .optional(),
});

const LLM_RATE_LIMIT_MESSAGE_PATTERN =
  /(rate\s*limit|too many requests|quota|resource exhausted)/i;

type ProviderHeaders = Headers | Record<string, string> | undefined;

type ErrorWithStatus = {
  headers?: ProviderHeaders;
  message?: unknown;
  status?: unknown;
};

function buildOcrUserPrompt(ocrSegments: string[]) {
  return ocrSegments
    .map(
      (segment, index) =>
        `Recipe photo ${index + 1} OCR text:\n"""\n${segment}\n"""`,
    )
    .join("\n\n");
}

function createLlmTimeoutError() {
  return new AppError({
    code: "LLM_TIMEOUT",
    message: "Recipe extraction timed out",
    statusCode: 502,
  });
}

function createProviderRateLimitError(
  candidate: LlmModelCandidate,
  cause?: unknown,
) {
  return new AppError({
    code: "LLM_PROVIDER_RATE_LIMITED",
    message:
      "Recipe extraction is temporarily rate limited. Please try again later.",
    statusCode: 503,
    cause: {
      provider: candidate.provider,
      model: candidate.model,
      detail: cause,
    },
  });
}

function isProviderRateLimitError(error: unknown) {
  return (
    isGeminiRateLimitError(error) ||
    (isAppError(error) && error.code === "LLM_PROVIDER_RATE_LIMITED")
  );
}

function getProviderApiKey(provider: OpenAiCompatibleProvider) {
  const env = getAiEnv();

  switch (provider) {
    case "mistral":
      return env.MISTRAL_API_KEY;
    case "groq":
      return env.GROQ_API_KEY;
    case "openrouter":
      return env.OPENROUTER_API_KEY;
    case "cerebras":
      return env.CEREBRAS_API_KEY;
  }
}

function getOpenAiCompatibleMessageText(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (
        typeof part === "object" &&
        part !== null &&
        "text" in part &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }

      return "";
    })
    .join("")
    .trim();
}

function isOpenAiCompatibleRateLimitResponse(status: number, body: unknown) {
  if (status === 429) {
    return true;
  }

  const parsedError = OPENAI_COMPATIBLE_ERROR_SCHEMA.safeParse(body);

  if (!parsedError.success) {
    return false;
  }

  return LLM_RATE_LIMIT_MESSAGE_PATTERN.test(
    `${parsedError.data.error?.type ?? ""} ${parsedError.data.error?.message ?? ""}`,
  );
}

function toHttpStatus(status: unknown) {
  return typeof status === "number" ? status : null;
}

function logLlmProviderRequestTelemetry(
  candidate: LlmModelCandidate,
  transport: "fetch" | "sdk",
  operation: "chatCompletions" | "generateContent",
  httpStatus: number | null,
  headers?: ProviderHeaders,
) {
  logger.info("LLM provider request telemetry", {
    provider: candidate.provider,
    model: candidate.model,
    transport,
    operation,
    httpStatus,
    responseReceived: httpStatus !== null,
    rateLimit: createRateLimitTelemetry(headers, httpStatus ?? undefined),
  });
}

async function generateWithGemini(
  candidate: LlmModelCandidate,
  request: StructuredRecipeJsonRequest,
  timeoutMs: number,
) {
  const ai = getGeminiClient();
  let response: Awaited<ReturnType<typeof ai.models.generateContent>>;

  try {
    response = await withTimeout(
      ai.models.generateContent({
        model: candidate.model,
        contents: [
          {
            role: "user",
            parts: [
              { text: request.instructionText },
              ...request.ocrSegments.map((segment, index) => ({
                text: `Recipe photo ${index + 1} OCR text:\n"""\n${segment}\n"""`,
              })),
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      }),
      timeoutMs,
      createLlmTimeoutError(),
    );
  } catch (error) {
    const { headers, status } = error as ErrorWithStatus;

    logLlmProviderRequestTelemetry(
      candidate,
      "sdk",
      "generateContent",
      toHttpStatus(status),
      headers,
    );

    throw error;
  }

  logLlmProviderRequestTelemetry(
    candidate,
    "sdk",
    "generateContent",
    response.sdkHttpResponse?.responseInternal?.status ?? null,
    response.sdkHttpResponse?.headers,
  );

  return response.text ?? "";
}

async function generateWithOpenAiCompatibleProvider(
  candidate: LlmModelCandidate,
  request: StructuredRecipeJsonRequest,
  timeoutMs: number,
) {
  const provider = candidate.provider as OpenAiCompatibleProvider;
  const apiKey = getProviderApiKey(provider);

  if (!apiKey) {
    throw new AppError({
      code: "LLM_PROVIDER_NOT_CONFIGURED",
      message: "Recipe extraction failed",
      statusCode: 500,
      cause: { provider },
    });
  }

  let response: Response;

  try {
    response = await withTimeout(
      fetch(OPENAI_COMPATIBLE_ENDPOINTS[provider], {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: candidate.model,
          messages: [
            {
              role: "system",
              content: request.instructionText,
            },
            {
              role: "user",
              content: buildOcrUserPrompt(request.ocrSegments),
            },
          ],
          temperature: 0.1,
        }),
      }),
      timeoutMs,
      createLlmTimeoutError(),
    );
  } catch (error) {
    const { headers, status } = error as ErrorWithStatus;

    logLlmProviderRequestTelemetry(
      candidate,
      "fetch",
      "chatCompletions",
      toHttpStatus(status),
      headers,
    );

    throw error;
  }

  logLlmProviderRequestTelemetry(
    candidate,
    "fetch",
    "chatCompletions",
    response.status,
    response.headers,
  );

  const rawBody = await response.text();
  let parsedBody: unknown = undefined;

  if (rawBody.trim()) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (error) {
      throw new AppError({
        code: "LLM_INVALID_RESPONSE",
        message: "Recipe extraction failed",
        statusCode: 502,
        cause: {
          provider,
          model: candidate.model,
          error,
        },
      });
    }
  }

  if (isOpenAiCompatibleRateLimitResponse(response.status, parsedBody)) {
    throw createProviderRateLimitError(candidate, {
      provider,
      status: response.status,
      body: parsedBody,
    });
  }

  if (!response.ok) {
    throw new AppError({
      code: "LLM_REQUEST_FAILED",
      message: "Recipe extraction failed",
      statusCode: 502,
      cause: {
        provider,
        model: candidate.model,
        status: response.status,
        body: parsedBody,
      },
    });
  }

  let data: z.infer<typeof OPENAI_COMPATIBLE_RESPONSE_SCHEMA>;

  try {
    data = OPENAI_COMPATIBLE_RESPONSE_SCHEMA.parse(parsedBody);
  } catch (error) {
    throw new AppError({
      code: "LLM_INVALID_RESPONSE",
      message: "Recipe extraction failed",
      statusCode: 502,
      cause: {
        provider,
        model: candidate.model,
        error,
      },
    });
  }

  const text = getOpenAiCompatibleMessageText(data.choices[0]?.message.content);

  if (!text.trim()) {
    throw new AppError({
      code: "LLM_EMPTY_RESPONSE",
      message: "Recipe extraction failed",
      statusCode: 502,
      cause: {
        provider,
        model: candidate.model,
      },
    });
  }

  return text;
}

export async function generateStructuredRecipeJsonText(
  request: StructuredRecipeJsonRequest,
) {
  const { GEMINI_TIMEOUT_MS, LLM_MODEL_CANDIDATES } = getAiEnv();

  for (let index = 0; index < LLM_MODEL_CANDIDATES.length; index += 1) {
    const candidate = LLM_MODEL_CANDIDATES[index];

    try {
      if (candidate.provider === "gemini") {
        return await generateWithGemini(candidate, request, GEMINI_TIMEOUT_MS);
      }

      return await generateWithOpenAiCompatibleProvider(
        candidate,
        request,
        GEMINI_TIMEOUT_MS,
      );
    } catch (error) {
      if (!isProviderRateLimitError(error)) {
        throw error;
      }

      logger.warn("LLM candidate rate limited", {
        provider: candidate.provider,
        model: candidate.model,
        remainingCandidates: LLM_MODEL_CANDIDATES.length - (index + 1),
      });

      if (index < LLM_MODEL_CANDIDATES.length - 1) {
        continue;
      }

      if (isAppError(error) && error.code === "LLM_PROVIDER_RATE_LIMITED") {
        throw error;
      }

      const { message, status } = error as ErrorWithStatus;

      throw new AppError({
        code: "LLM_PROVIDER_RATE_LIMITED",
        message:
          "Recipe extraction is temporarily rate limited. Please try again later.",
        statusCode: 503,
        cause: {
          provider: candidate.provider,
          model: candidate.model,
          status,
          message,
        },
      });
    }
  }

  throw new AppError({
    code: "LLM_PROVIDER_RATE_LIMITED",
    message:
      "Recipe extraction is temporarily rate limited. Please try again later.",
    statusCode: 503,
  });
}
