import { afterEach, describe, expect, it, vi } from "vitest";

const mockAiEnv = vi.hoisted(() => ({
  GEMINI_API_KEY: "gemini-key",
  GEMINI_MODEL: "gemini-2.5-flash-lite",
  GEMINI_MODELS: ["gemini-2.5-flash-lite"],
  GEMINI_TIMEOUT_MS: 1_000,
  MISTRAL_API_KEY: "mistral-key",
  MISTRAL_MODELS: ["mistral-small-latest"],
  GROQ_API_KEY: "groq-key",
  GROQ_MODELS: ["llama-3.3-70b-versatile"],
  OPENROUTER_API_KEY: "openrouter-key",
  OPENROUTER_MODELS: ["google/gemma-3-27b-it:free"],
  CEREBRAS_API_KEY: "cerebras-key",
  CEREBRAS_MODELS: ["qwen-3-32b"],
  LLM_MODEL_CANDIDATES: [
    { provider: "gemini" as const, model: "gemini-2.5-flash-lite" },
    { provider: "mistral" as const, model: "mistral-small-latest" },
    { provider: "groq" as const, model: "llama-3.3-70b-versatile" },
    {
      provider: "openrouter" as const,
      model: "google/gemma-3-27b-it:free",
    },
    { provider: "cerebras" as const, model: "qwen-3-32b" },
  ],
}));

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  invokeCerebrasChat: vi.fn(),
  invokeGroqChat: vi.fn(),
  invokeMistralChat: vi.fn(),
  invokeOpenRouterChat: vi.fn(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: mocks.logger,
}));

vi.mock("@/server/config/env", () => ({
  getAiEnv: () => mockAiEnv,
}));

vi.mock("./gemini", () => ({
  getGeminiClient: () => ({
    models: {
      generateContent: mocks.generateContent,
    },
  }),
  isGeminiRateLimitError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    (error as { status?: number }).status === 429,
}));

vi.mock("./provider-sdks", () => ({
  invokeCerebrasChat: mocks.invokeCerebrasChat,
  invokeGroqChat: mocks.invokeGroqChat,
  invokeMistralChat: mocks.invokeMistralChat,
  invokeOpenRouterChat: mocks.invokeOpenRouterChat,
}));

import {
  generateStructuredRecipeBatchJsonText,
  generateStructuredRecipeJsonText,
} from "./llm";
import { resetLlmProviderRotationState } from "./llm-provider-rotation";

function resetMockAiEnv() {
  mockAiEnv.GEMINI_API_KEY = "gemini-key";
  mockAiEnv.GEMINI_MODEL = "gemini-2.5-flash-lite";
  mockAiEnv.GEMINI_MODELS = ["gemini-2.5-flash-lite"];
  mockAiEnv.GEMINI_TIMEOUT_MS = 1_000;
  mockAiEnv.MISTRAL_API_KEY = "mistral-key";
  mockAiEnv.MISTRAL_MODELS = ["mistral-small-latest"];
  mockAiEnv.GROQ_API_KEY = "groq-key";
  mockAiEnv.GROQ_MODELS = ["llama-3.3-70b-versatile"];
  mockAiEnv.OPENROUTER_API_KEY = "openrouter-key";
  mockAiEnv.OPENROUTER_MODELS = ["google/gemma-3-27b-it:free"];
  mockAiEnv.CEREBRAS_API_KEY = "cerebras-key";
  mockAiEnv.CEREBRAS_MODELS = ["qwen-3-32b"];
  mockAiEnv.LLM_MODEL_CANDIDATES = [
    { provider: "gemini", model: "gemini-2.5-flash-lite" },
    { provider: "mistral", model: "mistral-small-latest" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "openrouter", model: "google/gemma-3-27b-it:free" },
    { provider: "cerebras", model: "qwen-3-32b" },
  ];
}

function createProviderSdkResponse(
  text: string,
  options: {
    headers?: Headers | Record<string, string>;
    httpStatus?: number | null;
  } = {},
) {
  return {
    headers: options.headers,
    httpStatus: options.httpStatus ?? null,
    result: {
      choices: [
        {
          message: {
            content: text,
          },
        },
      ],
    },
  };
}

describe("generateStructuredRecipeJsonText", () => {
  afterEach(() => {
    resetMockAiEnv();
    resetLlmProviderRotationState();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("uses the first Gemini candidate when it succeeds", async () => {
    mocks.generateContent.mockResolvedValue({
      sdkHttpResponse: {
        headers: {
          "x-ratelimit-limit-requests": "1000",
          "x-ratelimit-remaining-requests": "998",
          "x-ratelimit-reset-requests": "42s",
        },
        responseInternal: new Response(null, { status: 200 }),
      },
      text: '{"title":"Tomato Soup"}',
    });

    await expect(
      generateStructuredRecipeJsonText({
        instructionText: "Return JSON only",
        ocrSegments: ["Title: Tomato Soup"],
      }),
    ).resolves.toBe('{"title":"Tomato Soup"}');

    expect(mocks.generateContent).toHaveBeenCalledTimes(1);
    expect(mocks.generateContent.mock.calls[0]?.[0]?.model).toBe(
      "gemini-2.5-flash-lite",
    );
    expect(mocks.logger.info).toHaveBeenCalledWith(
      "LLM provider request telemetry",
      expect.objectContaining({
        provider: "gemini",
        model: "gemini-2.5-flash-lite",
        transport: "sdk",
        operation: "generateContent",
        httpStatus: 200,
        responseReceived: true,
        rateLimit: expect.objectContaining({
          source: "headers",
          status: "ok",
          requestLimit: 1000,
          requestRemaining: 998,
          requestResetSeconds: 42,
        }),
      }),
    );
  });

  it("does not crash when Gemini sdkHttpResponse lacks responseInternal", async () => {
    mocks.generateContent.mockResolvedValue({
      sdkHttpResponse: {
        headers: {
          "x-ratelimit-limit-requests": "1000",
          "x-ratelimit-remaining-requests": "997",
        },
      },
      text: '{"title":"Tomato Soup"}',
    });

    await expect(
      generateStructuredRecipeJsonText({
        instructionText: "Return JSON only",
        ocrSegments: ["Title: Tomato Soup"],
      }),
    ).resolves.toBe('{"title":"Tomato Soup"}');

    expect(mocks.logger.info).toHaveBeenCalledWith(
      "LLM provider request telemetry",
      expect.objectContaining({
        provider: "gemini",
        model: "gemini-2.5-flash-lite",
        transport: "sdk",
        operation: "generateContent",
        httpStatus: null,
        responseReceived: false,
        rateLimit: expect.objectContaining({
          source: "headers",
          status: "ok",
          requestLimit: 1000,
          requestRemaining: 997,
        }),
      }),
    );
  });

  it("falls back to the next provider when the current candidate is rate limited", async () => {
    mocks.generateContent.mockRejectedValueOnce({
      headers: new Headers({
        "retry-after": "30",
        "x-ratelimit-remaining-requests": "0",
      }),
      message: "Too many requests",
      status: 429,
    });

    mocks.invokeMistralChat.mockResolvedValueOnce(
      createProviderSdkResponse('{"title":"Tomato Soup","steps":["Simmer."]}', {
        headers: {
          "x-ratelimit-limit-requests": "120",
          "x-ratelimit-remaining-requests": "119",
          "x-ratelimit-reset-requests": "60",
        },
        httpStatus: 200,
      }),
    );

    await expect(
      generateStructuredRecipeJsonText({
        instructionText: "Return JSON only",
        ocrSegments: ["Title: Tomato Soup"],
      }),
    ).resolves.toContain("Tomato Soup");

    expect(mocks.invokeMistralChat).toHaveBeenCalledTimes(1);
    expect(mocks.invokeMistralChat).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mistral-small-latest",
        temperature: 0.1,
      }),
    );
    expect(mocks.logger.info).toHaveBeenCalledWith(
      "LLM provider request telemetry",
      expect.objectContaining({
        provider: "gemini",
        model: "gemini-2.5-flash-lite",
        transport: "sdk",
        operation: "generateContent",
        httpStatus: 429,
        responseReceived: true,
        rateLimit: expect.objectContaining({
          source: "headers",
          status: "limited",
          requestRemaining: 0,
          retryAfterSeconds: 30,
        }),
      }),
    );
    expect(mocks.logger.info).toHaveBeenCalledWith(
      "LLM provider request telemetry",
      expect.objectContaining({
        provider: "mistral",
        model: "mistral-small-latest",
        transport: "sdk",
        operation: "chatCompletions",
        httpStatus: 200,
        responseReceived: true,
        rateLimit: expect.objectContaining({
          source: "headers",
          status: "ok",
          requestLimit: 120,
          requestRemaining: 119,
          requestResetSeconds: 60,
        }),
      }),
    );
  });

  it("treats provider SDK statusCode 429 errors as rate limits", async () => {
    mocks.generateContent.mockRejectedValueOnce({
      headers: new Headers({
        "retry-after": "30",
      }),
      message: "Too many requests",
      status: 429,
    });

    mocks.invokeMistralChat.mockRejectedValueOnce({
      headers: new Headers({
        "retry-after": "45",
        "x-ratelimit-remaining-requests": "0",
      }),
      message: "Provider throttled the request",
      statusCode: 429,
    });

    mocks.invokeGroqChat.mockResolvedValueOnce(
      createProviderSdkResponse('{"title":"Tomato Soup","steps":["Simmer."]}', {
        headers: {
          "x-ratelimit-limit-requests": "240",
          "x-ratelimit-remaining-requests": "239",
        },
        httpStatus: 200,
      }),
    );

    await expect(
      generateStructuredRecipeJsonText({
        instructionText: "Return JSON only",
        ocrSegments: ["Title: Tomato Soup"],
      }),
    ).resolves.toContain("Tomato Soup");

    expect(mocks.invokeMistralChat).toHaveBeenCalledTimes(1);
    expect(mocks.invokeGroqChat).toHaveBeenCalledTimes(1);
    expect(mocks.logger.info).toHaveBeenCalledWith(
      "LLM provider request telemetry",
      expect.objectContaining({
        provider: "mistral",
        model: "mistral-small-latest",
        transport: "sdk",
        operation: "chatCompletions",
        httpStatus: 429,
        responseReceived: true,
      }),
    );
  });

  it("skips sibling models from a rate-limited provider within the same request", async () => {
    mockAiEnv.MISTRAL_MODELS = ["mistral-small-latest", "ministral-8b-latest"];
    mockAiEnv.LLM_MODEL_CANDIDATES = [
      { provider: "gemini", model: "gemini-2.5-flash-lite" },
      { provider: "mistral", model: "mistral-small-latest" },
      { provider: "mistral", model: "ministral-8b-latest" },
      { provider: "groq", model: "llama-3.3-70b-versatile" },
    ];

    mocks.generateContent.mockRejectedValueOnce({
      headers: new Headers({
        "retry-after": "30",
      }),
      message: "Too many requests",
      status: 429,
    });

    mocks.invokeMistralChat.mockRejectedValueOnce({
      headers: new Headers({
        "retry-after": "45",
      }),
      message: "Provider throttled the request",
      status: 429,
    });

    mocks.invokeGroqChat.mockResolvedValueOnce(
      createProviderSdkResponse('{"title":"Tomato Soup","steps":["Simmer."]}'),
    );

    await expect(
      generateStructuredRecipeJsonText({
        instructionText: "Return JSON only",
        ocrSegments: ["Title: Tomato Soup"],
      }),
    ).resolves.toContain("Tomato Soup");

    expect(mocks.invokeMistralChat).toHaveBeenCalledTimes(1);
    expect(mocks.invokeMistralChat).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mistral-small-latest",
      }),
    );
    expect(mocks.invokeGroqChat).toHaveBeenCalledTimes(1);
    expect(mocks.invokeOpenRouterChat).not.toHaveBeenCalled();
    expect(mocks.invokeCerebrasChat).not.toHaveBeenCalled();
  });

  it("rotates through each configured provider across requests", async () => {
    mocks.generateContent.mockResolvedValue({
      sdkHttpResponse: {
        headers: {},
        responseInternal: new Response(null, { status: 200 }),
      },
      text: '{"title":"Tomato Soup"}',
    });

    mocks.invokeMistralChat.mockResolvedValue(
      createProviderSdkResponse('{"title":"Tomato Soup","steps":["Simmer."]}'),
    );
    mocks.invokeGroqChat.mockResolvedValue(
      createProviderSdkResponse('{"title":"Tomato Soup","steps":["Simmer."]}'),
    );
    mocks.invokeOpenRouterChat.mockResolvedValue(
      createProviderSdkResponse('{"title":"Tomato Soup","steps":["Simmer."]}'),
    );
    mocks.invokeCerebrasChat.mockResolvedValue(
      createProviderSdkResponse('{"title":"Tomato Soup","steps":["Simmer."]}'),
    );

    for (let requestCount = 0; requestCount < 5; requestCount += 1) {
      await expect(
        generateStructuredRecipeJsonText({
          instructionText: "Return JSON only",
          ocrSegments: ["Title: Tomato Soup"],
        }),
      ).resolves.toContain("Tomato Soup");
    }

    expect(mocks.generateContent).toHaveBeenCalledTimes(1);
    expect(mocks.invokeMistralChat).toHaveBeenCalledTimes(1);
    expect(mocks.invokeGroqChat).toHaveBeenCalledTimes(1);
    expect(mocks.invokeOpenRouterChat).toHaveBeenCalledTimes(1);
    expect(mocks.invokeCerebrasChat).toHaveBeenCalledTimes(1);
  });

  it("skips cooled-down providers until their retry windows expire", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-19T00:00:00.000Z"));

    mocks.generateContent.mockRejectedValueOnce({
      headers: new Headers({
        "retry-after": "30",
        "x-ratelimit-remaining-requests": "0",
      }),
      message: "Too many requests",
      status: 429,
    });

    const providerRateLimitError = {
      headers: new Headers({
        "retry-after": "45",
      }),
      message: "Too many requests",
      status: 429,
    };

    mocks.invokeMistralChat.mockRejectedValueOnce(providerRateLimitError);
    mocks.invokeGroqChat.mockRejectedValueOnce(providerRateLimitError);
    mocks.invokeOpenRouterChat.mockRejectedValueOnce(providerRateLimitError);
    mocks.invokeCerebrasChat.mockRejectedValueOnce(providerRateLimitError);

    await expect(
      generateStructuredRecipeJsonText({
        instructionText: "Return JSON only",
        ocrSegments: ["Title: Tomato Soup"],
      }),
    ).rejects.toMatchObject({
      code: "LLM_PROVIDER_RATE_LIMITED",
      statusCode: 503,
    });

    expect(mocks.generateContent).toHaveBeenCalledTimes(1);
    expect(mocks.invokeMistralChat).toHaveBeenCalledTimes(1);
    expect(mocks.invokeGroqChat).toHaveBeenCalledTimes(1);
    expect(mocks.invokeOpenRouterChat).toHaveBeenCalledTimes(1);
    expect(mocks.invokeCerebrasChat).toHaveBeenCalledTimes(1);

    mocks.generateContent.mockClear();
    mocks.invokeMistralChat.mockClear();
    mocks.invokeGroqChat.mockClear();
    mocks.invokeOpenRouterChat.mockClear();
    mocks.invokeCerebrasChat.mockClear();

    await expect(
      generateStructuredRecipeJsonText({
        instructionText: "Return JSON only",
        ocrSegments: ["Title: Tomato Soup"],
      }),
    ).rejects.toMatchObject({
      code: "LLM_PROVIDER_RATE_LIMITED",
      statusCode: 503,
    });

    expect(mocks.generateContent).not.toHaveBeenCalled();
    expect(mocks.invokeMistralChat).not.toHaveBeenCalled();
    expect(mocks.invokeGroqChat).not.toHaveBeenCalled();
    expect(mocks.invokeOpenRouterChat).not.toHaveBeenCalled();
    expect(mocks.invokeCerebrasChat).not.toHaveBeenCalled();

    vi.setSystemTime(new Date("2026-05-19T00:00:46.000Z"));

    mocks.generateContent.mockResolvedValueOnce({
      sdkHttpResponse: {
        headers: {},
        responseInternal: new Response(null, { status: 200 }),
      },
      text: '{"title":"Tomato Soup"}',
    });

    await expect(
      generateStructuredRecipeJsonText({
        instructionText: "Return JSON only",
        ocrSegments: ["Title: Tomato Soup"],
      }),
    ).resolves.toContain("Tomato Soup");

    expect(mocks.generateContent).toHaveBeenCalledTimes(1);
    expect(mocks.invokeMistralChat).not.toHaveBeenCalled();
    expect(mocks.invokeGroqChat).not.toHaveBeenCalled();
    expect(mocks.invokeOpenRouterChat).not.toHaveBeenCalled();
    expect(mocks.invokeCerebrasChat).not.toHaveBeenCalled();
  });

  it("falls back to the next provider when Gemini fails without rate limiting", async () => {
    mocks.generateContent.mockRejectedValueOnce({
      message: "Internal server error",
      status: 503,
    });

    mocks.invokeMistralChat.mockResolvedValueOnce(
      createProviderSdkResponse('{"title":"Tomato Soup","steps":["Simmer."]}'),
    );

    await expect(
      generateStructuredRecipeJsonText({
        instructionText: "Return JSON only",
        ocrSegments: ["Title: Tomato Soup"],
      }),
    ).resolves.toContain("Tomato Soup");

    expect(mocks.generateContent).toHaveBeenCalledTimes(1);
    expect(mocks.invokeMistralChat).toHaveBeenCalledTimes(1);
  });

  it("falls back to the next provider when an sdk-backed provider times out", async () => {
    vi.useFakeTimers();

    mocks.generateContent.mockRejectedValueOnce({
      headers: new Headers({
        "retry-after": "30",
      }),
      message: "Too many requests",
      status: 429,
    });

    mocks.invokeMistralChat.mockImplementationOnce(
      () => new Promise(() => undefined),
    );

    const requestPromise = generateStructuredRecipeJsonText({
      instructionText: "Return JSON only",
      ocrSegments: ["Title: Tomato Soup"],
    });

    await vi.advanceTimersByTimeAsync(1_000);

    mocks.invokeGroqChat.mockResolvedValueOnce(
      createProviderSdkResponse('{"title":"Tomato Soup","steps":["Simmer."]}'),
    );

    await expect(requestPromise).resolves.toContain("Tomato Soup");

    expect(mocks.invokeMistralChat).toHaveBeenCalledTimes(1);
    expect(mocks.invokeGroqChat).toHaveBeenCalledTimes(1);
  });

  it("falls back again when a provider returns an empty response after fallback", async () => {
    mocks.generateContent.mockRejectedValueOnce({
      headers: new Headers({
        "retry-after": "30",
      }),
      message: "Too many requests",
      status: 429,
    });
    mocks.invokeMistralChat.mockResolvedValueOnce({
      httpStatus: 200,
      result: {
        choices: [
          {
            message: {
              content: "",
            },
          },
        ],
      },
    });

    mocks.invokeGroqChat.mockResolvedValueOnce(
      createProviderSdkResponse('{"title":"Tomato Soup","steps":["Simmer."]}'),
    );

    await expect(
      generateStructuredRecipeJsonText({
        instructionText: "Return JSON only",
        ocrSegments: ["Title: Tomato Soup"],
      }),
    ).resolves.toContain("Tomato Soup");

    expect(mocks.invokeMistralChat).toHaveBeenCalledTimes(1);
    expect(mocks.invokeGroqChat).toHaveBeenCalledTimes(1);
    expect(mocks.invokeOpenRouterChat).not.toHaveBeenCalled();
    expect(mocks.invokeCerebrasChat).not.toHaveBeenCalled();
  });

  it("falls back when a provider returns invalid JSON text", async () => {
    mocks.generateContent.mockResolvedValueOnce({
      sdkHttpResponse: {
        headers: {},
        responseInternal: new Response(null, { status: 200 }),
      },
      text: "not-json",
    });

    mocks.invokeMistralChat.mockResolvedValueOnce(
      createProviderSdkResponse('{"title":"Tomato Soup","steps":["Simmer."]}'),
    );

    await expect(
      generateStructuredRecipeJsonText({
        instructionText: "Return JSON only",
        ocrSegments: ["Title: Tomato Soup"],
      }),
    ).resolves.toContain("Tomato Soup");

    expect(mocks.generateContent).toHaveBeenCalledTimes(1);
    expect(mocks.invokeMistralChat).toHaveBeenCalledTimes(1);
  });

  it("serializes multiple recipes into one LLM request with stable identifiers", async () => {
    mocks.generateContent.mockResolvedValue({
      sdkHttpResponse: {
        headers: {},
        responseInternal: new Response(null, { status: 200 }),
      },
      text: JSON.stringify({
        recipes: [
          {
            recipeId: "recipe-1",
            recipe: {
              title: "Tomato Soup",
              ingredients: [{ name: "Tomatoes" }],
              steps: ["Simmer."],
            },
          },
          {
            recipeId: "recipe-2",
            recipe: {
              title: "Grilled Cheese",
              ingredients: [{ name: "Bread" }],
              steps: ["Toast."],
            },
          },
        ],
      }),
    });

    await expect(
      generateStructuredRecipeBatchJsonText({
        instructionText: "Return JSON only",
        recipeInputs: [
          {
            recipeId: "recipe-1",
            ocrSegments: ["Title: Tomato Soup", "Steps: Simmer."],
          },
          {
            recipeId: "recipe-2",
            ocrSegments: ["Title: Grilled Cheese", "Steps: Toast."],
          },
        ],
      }),
    ).resolves.toContain('"recipeId":"recipe-1"');

    expect(mocks.generateContent).toHaveBeenCalledTimes(1);

    const parts =
      mocks.generateContent.mock.calls[0]?.[0]?.contents?.[0]?.parts;

    expect(parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining("Recipe identifier recipe-1:"),
        }),
        expect.objectContaining({
          text: expect.stringContaining("Recipe recipe-2 photo 1 OCR text"),
        }),
      ]),
    );
  });
});
