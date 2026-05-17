import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/server/shared/errors";

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
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
  getAiEnv: () => ({
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
      { provider: "gemini", model: "gemini-2.5-flash-lite" },
      { provider: "groq", model: "llama-3.3-70b-versatile" },
    ],
  }),
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

import {
  generateStructuredRecipeBatchJsonText,
  generateStructuredRecipeJsonText,
} from "./llm";

describe("generateStructuredRecipeJsonText", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
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

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: '{"title":"Tomato Soup","steps":["Simmer."]}',
                },
              },
            ],
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "x-ratelimit-limit-requests": "120",
              "x-ratelimit-remaining-requests": "119",
              "x-ratelimit-reset-requests": "60",
            },
            status: 200,
          },
        ),
      ),
    );

    await expect(
      generateStructuredRecipeJsonText({
        instructionText: "Return JSON only",
        ocrSegments: ["Title: Tomato Soup"],
      }),
    ).resolves.toContain("Tomato Soup");

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer groq-key",
        }),
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
        provider: "groq",
        model: "llama-3.3-70b-versatile",
        transport: "fetch",
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

  it("does not continue to the next candidate on non-rate-limit failures", async () => {
    mocks.generateContent.mockRejectedValueOnce(
      new AppError({
        code: "LLM_REQUEST_FAILED",
        message: "Recipe extraction failed",
        statusCode: 502,
      }),
    );

    await expect(
      generateStructuredRecipeJsonText({
        instructionText: "Return JSON only",
        ocrSegments: ["Title: Tomato Soup"],
      }),
    ).rejects.toMatchObject({
      code: "LLM_REQUEST_FAILED",
      statusCode: 502,
    });

    expect(mocks.generateContent).toHaveBeenCalledTimes(1);
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
