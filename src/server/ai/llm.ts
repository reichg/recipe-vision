import { z } from "zod";

import { logger } from "@/lib/logger";
import {
  getAiEnv,
  type LlmModelCandidate,
  type LlmProviderName,
} from "@/server/config/env";
import { AppError, isAppError } from "@/server/shared/errors";
import {
  createRateLimitTelemetry,
  type RateLimitTelemetry,
} from "@/server/shared/http";
import { withTimeout } from "@/server/shared/timeout";

import { getGeminiClient, isGeminiRateLimitError } from "./gemini";
import {
  createLlmProvidersRateLimitedError,
  getLlmCandidateExecutionOrder,
  markLlmCandidateSuccess,
  markLlmProviderRateLimited,
} from "./llm-provider-rotation";
import {
  invokeCerebrasChat,
  invokeGroqChat,
  invokeMistralChat,
  invokeOpenRouterChat,
  type ProviderSdkHeaders,
  type ProviderSdkRequest,
  type ProviderSdkResponse,
} from "./provider-sdks";

type StructuredRecipeJsonRequest = {
  instructionText: string;
  ocrSegments: string[];
};

type StructuredRecipeBatchJsonRequest = {
  instructionText: string;
  recipeInputs: Array<{
    recipeId: string;
    ocrSegments: string[];
  }>;
};

type StructuredRecipePromptRequest = {
  instructionText: string;
  userPromptSections: string[];
};

type OpenAiCompatibleProvider = Exclude<LlmProviderName, "gemini">;

const CHAT_COMPLETION_RESPONSE_SCHEMA = z.object({
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

const LLM_RATE_LIMIT_MESSAGE_PATTERN =
  /(rate\s*limit|too many requests|quota|resource exhausted)/i;
const LLM_RATE_LIMITED_MESSAGE =
  "Recipe extraction is temporarily rate limited. Please try again later.";

type ErrorWithStatus = {
  code?: unknown;
  headers?: ProviderSdkHeaders;
  message?: unknown;
  name?: unknown;
  response?: {
    headers?: ProviderSdkHeaders;
    status?: unknown;
    statusCode?: unknown;
  };
  status?: unknown;
  statusCode?: unknown;
  type?: unknown;
};

const PROVIDER_SDK_EXECUTORS: Record<
  OpenAiCompatibleProvider,
  (request: ProviderSdkRequest) => Promise<ProviderSdkResponse>
> = {
  mistral: invokeMistralChat,
  groq: invokeGroqChat,
  openrouter: invokeOpenRouterChat,
  cerebras: invokeCerebrasChat,
};

function getLlmCandidateKey(candidate: LlmModelCandidate) {
  return `${candidate.provider}:${candidate.model}`;
}

function buildSingleRecipePromptSections(ocrSegments: string[]) {
  return ocrSegments.map(
    (segment, index) =>
      `Recipe photo ${index + 1} OCR text:\n"""\n${segment}\n"""`,
  );
}

function buildBatchRecipePromptSections(
  recipeInputs: StructuredRecipeBatchJsonRequest["recipeInputs"],
) {
  return recipeInputs.map(({ recipeId, ocrSegments }) =>
    [
      `Recipe identifier ${recipeId}:`,
      ...ocrSegments.map(
        (segment, index) =>
          `Recipe ${recipeId} photo ${index + 1} OCR text:\n"""\n${segment}\n"""`,
      ),
    ].join("\n\n"),
  );
}

function buildUserPrompt(userPromptSections: string[]) {
  return userPromptSections.join("\n\n");
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
  options: {
    headers?: ProviderSdkHeaders;
    status?: number | null;
  } = {},
) {
  return new AppError({
    code: "LLM_PROVIDER_RATE_LIMITED",
    message: LLM_RATE_LIMITED_MESSAGE,
    statusCode: 503,
    cause: {
      provider: candidate.provider,
      model: candidate.model,
      rateLimit: createRateLimitTelemetry(
        options.headers,
        options.status ?? undefined,
      ),
      status: options.status ?? null,
    },
  });
}

function createProviderRequestFailedError(
  candidate: LlmModelCandidate,
  error: unknown,
) {
  const { status } = getProviderErrorMetadata(error);

  return new AppError({
    code: "LLM_REQUEST_FAILED",
    message: "Recipe extraction failed",
    statusCode: 502,
    cause: {
      provider: candidate.provider,
      model: candidate.model,
      providerError: getProviderErrorSummary(error),
      status,
    },
  });
}

function createProviderResponseError(
  candidate: LlmModelCandidate,
  code: "LLM_EMPTY_RESPONSE" | "LLM_INVALID_RESPONSE",
  cause?: unknown,
) {
  return new AppError({
    code,
    message: "Recipe extraction failed",
    statusCode: 502,
    cause: {
      provider: candidate.provider,
      model: candidate.model,
      ...(cause === undefined ? {} : { providerError: cause }),
    },
  });
}

function isProviderRateLimitError(error: unknown) {
  return (
    isGeminiRateLimitError(error) ||
    (isAppError(error) && error.code === "LLM_PROVIDER_RATE_LIMITED")
  );
}

function isRecoverableProviderFailure(error: unknown): error is AppError {
  if (!isAppError(error)) {
    return false;
  }

  return (
    error.code === "LLM_EMPTY_RESPONSE" ||
    error.code === "LLM_INVALID_RESPONSE" ||
    error.code === "LLM_PROVIDER_NOT_CONFIGURED" ||
    error.code === "LLM_REQUEST_FAILED" ||
    error.code === "LLM_TIMEOUT"
  );
}

function getProviderRateLimitRetryAfterSeconds(error: unknown) {
  if (!isAppError(error) || error.code !== "LLM_PROVIDER_RATE_LIMITED") {
    return null;
  }

  const cause = error.cause;

  if (typeof cause !== "object" || cause === null || !("rateLimit" in cause)) {
    return null;
  }

  const rateLimit = (cause as { rateLimit?: RateLimitTelemetry }).rateLimit;

  if (!rateLimit) {
    return null;
  }

  return (
    rateLimit.retryAfterSeconds ??
    rateLimit.requestResetSeconds ??
    rateLimit.tokenResetSeconds ??
    rateLimit.resetSeconds
  );
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

function validateProviderJsonText(candidate: LlmModelCandidate, text: string) {
  if (!text.trim()) {
    throw createProviderResponseError(candidate, "LLM_EMPTY_RESPONSE");
  }

  try {
    JSON.parse(text);
  } catch {
    throw createProviderResponseError(candidate, "LLM_INVALID_RESPONSE", {
      reason: "invalid_json",
    });
  }

  return text;
}

function toHttpStatus(status: unknown) {
  return typeof status === "number" ? status : null;
}

function getProviderErrorMetadata(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return {
      headers: undefined as ProviderSdkHeaders,
      status: null as number | null,
    };
  }

  const { headers, response, status, statusCode } = error as ErrorWithStatus;

  const responseStatus =
    typeof response === "object" && response !== null
      ? (response.status ?? response.statusCode)
      : undefined;

  return {
    headers:
      typeof response === "object" && response !== null
        ? (response.headers ?? headers)
        : headers,
    status:
      typeof response === "object" && response !== null
        ? toHttpStatus(responseStatus ?? status ?? statusCode)
        : toHttpStatus(status ?? statusCode),
  };
}

function getProviderErrorSummary(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const { code, name, type } = error as ErrorWithStatus;

  return {
    code: code === undefined ? undefined : String(code),
    type:
      typeof type === "string"
        ? type
        : typeof name === "string"
          ? name
          : undefined,
  };
}

function isProviderSdkRateLimitError(error: unknown) {
  const { status } = getProviderErrorMetadata(error);

  if (status === 429) {
    return true;
  }

  if (typeof error !== "object" || error === null) {
    return false;
  }

  const { code, message, name, type } = error as ErrorWithStatus;

  return (
    name === "RateLimitError" ||
    LLM_RATE_LIMIT_MESSAGE_PATTERN.test(
      `${String(code ?? "")} ${typeof type === "string" ? type : ""} ${typeof name === "string" ? name : ""} ${typeof message === "string" ? message : ""}`,
    )
  );
}

function logLlmProviderRequestTelemetry(
  candidate: LlmModelCandidate,
  transport: "fetch" | "sdk",
  operation: "chatCompletions" | "generateContent",
  httpStatus: number | null,
  headers?: ProviderSdkHeaders,
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

function getRemainingCandidateAvailability(
  candidates: readonly LlmModelCandidate[],
  attemptedCandidates: ReadonlySet<string>,
) {
  const executionOrder = getLlmCandidateExecutionOrder(candidates);

  return {
    blockedProviders: executionOrder.blockedProviders,
    remainingCandidates: executionOrder.candidates.filter(
      (entry) => !attemptedCandidates.has(getLlmCandidateKey(entry)),
    ).length,
  };
}

async function generateWithGemini(
  candidate: LlmModelCandidate,
  request: StructuredRecipePromptRequest,
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
              ...request.userPromptSections.map((section) => ({
                text: section,
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
    const httpStatus = toHttpStatus(status);

    logLlmProviderRequestTelemetry(
      candidate,
      "sdk",
      "generateContent",
      httpStatus,
      headers,
    );

    if (isGeminiRateLimitError(error)) {
      throw createProviderRateLimitError(candidate, {
        headers,
        status: httpStatus,
      });
    }

    if (isAppError(error) && error.code === "LLM_TIMEOUT") {
      throw error;
    }

    throw createProviderRequestFailedError(candidate, error);
  }

  logLlmProviderRequestTelemetry(
    candidate,
    "sdk",
    "generateContent",
    response.sdkHttpResponse?.responseInternal?.status ?? null,
    response.sdkHttpResponse?.headers,
  );

  return validateProviderJsonText(candidate, response.text ?? "");
}

async function generateWithProviderSdk(
  candidate: LlmModelCandidate,
  request: StructuredRecipePromptRequest,
  timeoutMs: number,
) {
  const provider = candidate.provider as OpenAiCompatibleProvider;
  const executeProviderRequest = PROVIDER_SDK_EXECUTORS[provider];
  let response: ProviderSdkResponse;

  try {
    response = await withTimeout(
      executeProviderRequest({
        model: candidate.model,
        messages: [
          {
            role: "system",
            content: request.instructionText,
          },
          {
            role: "user",
            content: buildUserPrompt(request.userPromptSections),
          },
        ],
        temperature: 0.1,
      }),
      timeoutMs,
      createLlmTimeoutError(),
    );
  } catch (error) {
    const { headers, status } = getProviderErrorMetadata(error);

    logLlmProviderRequestTelemetry(
      candidate,
      "sdk",
      "chatCompletions",
      status,
      headers,
    );

    if (isProviderSdkRateLimitError(error)) {
      throw createProviderRateLimitError(candidate, {
        headers,
        status,
      });
    }

    if (isAppError(error) && error.code === "LLM_TIMEOUT") {
      throw error;
    }

    throw createProviderRequestFailedError(candidate, error);
  }

  logLlmProviderRequestTelemetry(
    candidate,
    "sdk",
    "chatCompletions",
    response.httpStatus,
    response.headers,
  );

  let data: z.infer<typeof CHAT_COMPLETION_RESPONSE_SCHEMA>;

  try {
    data = CHAT_COMPLETION_RESPONSE_SCHEMA.parse(response.result);
  } catch {
    throw new AppError({
      code: "LLM_INVALID_RESPONSE",
      message: "Recipe extraction failed",
      statusCode: 502,
      cause: {
        provider,
        model: candidate.model,
        reason: "invalid_chat_completion_response",
      },
    });
  }

  const text = getOpenAiCompatibleMessageText(data.choices[0]?.message.content);

  return validateProviderJsonText(candidate, text);
}

async function generateStructuredRecipeResponseText(
  request: StructuredRecipePromptRequest,
) {
  const { GEMINI_TIMEOUT_MS, LLM_MODEL_CANDIDATES } = getAiEnv();
  const attemptedCandidates = new Set<string>();
  let lastRecoverableError: AppError | null = null;

  while (attemptedCandidates.size < LLM_MODEL_CANDIDATES.length) {
    const executionOrder = getLlmCandidateExecutionOrder(LLM_MODEL_CANDIDATES);
    const candidate = executionOrder.candidates.find(
      (entry) => !attemptedCandidates.has(getLlmCandidateKey(entry)),
    );

    if (!candidate) {
      throw createLlmProvidersRateLimitedError(executionOrder.blockedProviders);
    }

    attemptedCandidates.add(getLlmCandidateKey(candidate));

    try {
      const responseText =
        candidate.provider === "gemini"
          ? await generateWithGemini(candidate, request, GEMINI_TIMEOUT_MS)
          : await generateWithProviderSdk(
              candidate,
              request,
              GEMINI_TIMEOUT_MS,
            );

      markLlmCandidateSuccess(LLM_MODEL_CANDIDATES, candidate);

      return responseText;
    } catch (error) {
      if (isProviderRateLimitError(error)) {
        const retryAfterSeconds = getProviderRateLimitRetryAfterSeconds(error);

        markLlmProviderRateLimited(
          LLM_MODEL_CANDIDATES,
          candidate,
          retryAfterSeconds,
        );

        const nextCandidateAvailability = getRemainingCandidateAvailability(
          LLM_MODEL_CANDIDATES,
          attemptedCandidates,
        );

        logger.warn("LLM candidate rate limited", {
          provider: candidate.provider,
          model: candidate.model,
          remainingCandidates: nextCandidateAvailability.remainingCandidates,
          retryAfterSeconds,
        });

        if (nextCandidateAvailability.remainingCandidates > 0) {
          continue;
        }

        if (lastRecoverableError) {
          throw lastRecoverableError;
        }

        throw createLlmProvidersRateLimitedError(
          nextCandidateAvailability.blockedProviders,
        );
      }

      if (!isRecoverableProviderFailure(error)) {
        throw error;
      }

      lastRecoverableError = error;

      const nextCandidateAvailability = getRemainingCandidateAvailability(
        LLM_MODEL_CANDIDATES,
        attemptedCandidates,
      );

      if (nextCandidateAvailability.remainingCandidates > 0) {
        continue;
      }

      throw lastRecoverableError;
    }
  }

  if (lastRecoverableError) {
    throw lastRecoverableError;
  }

  throw createLlmProvidersRateLimitedError(
    getLlmCandidateExecutionOrder(LLM_MODEL_CANDIDATES).blockedProviders,
  );
}

export async function generateStructuredRecipeJsonText(
  request: StructuredRecipeJsonRequest,
) {
  return generateStructuredRecipeResponseText({
    instructionText: request.instructionText,
    userPromptSections: buildSingleRecipePromptSections(request.ocrSegments),
  });
}

export async function generateStructuredRecipeBatchJsonText(
  request: StructuredRecipeBatchJsonRequest,
) {
  return generateStructuredRecipeResponseText({
    instructionText: request.instructionText,
    userPromptSections: buildBatchRecipePromptSections(request.recipeInputs),
  });
}
