import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const mistralComplete = vi.fn();
  const groqCreate = vi.fn();
  const openRouterSend = vi.fn();
  const cerebrasCreate = vi.fn();

  return {
    Cerebras: vi.fn(function MockCerebras() {
      return {
        chat: {
          completions: {
            create: cerebrasCreate,
          },
        },
      };
    }),
    Groq: vi.fn(function MockGroq() {
      return {
        chat: {
          completions: {
            create: groqCreate,
          },
        },
      };
    }),
    Mistral: vi.fn(function MockMistral() {
      return {
        chat: {
          complete: mistralComplete,
        },
      };
    }),
    OpenRouter: vi.fn(function MockOpenRouter() {
      return {
        chat: {
          send: openRouterSend,
        },
      };
    }),
    cerebrasCreate,
    groqCreate,
    mistralComplete,
    openRouterSend,
  };
});

vi.mock("@mistralai/mistralai", () => ({
  Mistral: mocks.Mistral,
}));

vi.mock("groq-sdk", () => ({
  default: mocks.Groq,
}));

vi.mock("@openrouter/sdk", () => ({
  OpenRouter: mocks.OpenRouter,
}));

vi.mock("@cerebras/cerebras_cloud_sdk", () => ({
  default: mocks.Cerebras,
}));

vi.mock("@/server/config/env", () => ({
  getAiEnv: () => ({
    CEREBRAS_API_KEY: "cerebras-key",
    GROQ_API_KEY: "groq-key",
    MISTRAL_API_KEY: "mistral-key",
    OPENROUTER_API_KEY: "openrouter-key",
  }),
}));

import {
  invokeCerebrasChat,
  invokeGroqChat,
  invokeMistralChat,
  invokeOpenRouterChat,
  resetProviderSdkClients,
} from "./provider-sdks";

const providerRequest = {
  messages: [
    { content: "Return JSON only", role: "system" as const },
    { content: "Title: Tomato Soup", role: "user" as const },
  ],
  model: "test-model",
  temperature: 0.1,
};

describe("provider-sdks", () => {
  afterEach(() => {
    resetProviderSdkClients();
    vi.clearAllMocks();
  });

  it("configures the Mistral SDK without automatic retries", async () => {
    mocks.mistralComplete.mockResolvedValueOnce({ id: "mistral-response" });

    await expect(invokeMistralChat(providerRequest)).resolves.toMatchObject({
      httpStatus: null,
      result: { id: "mistral-response" },
    });

    expect(mocks.Mistral).toHaveBeenCalledWith({
      apiKey: "mistral-key",
      retryConfig: { strategy: "none" },
    });
    expect(mocks.mistralComplete).toHaveBeenCalledWith({
      messages: providerRequest.messages,
      model: providerRequest.model,
      temperature: providerRequest.temperature,
    });
  });

  it("configures the Groq SDK without automatic retries", async () => {
    mocks.groqCreate.mockReturnValueOnce({
      withResponse: vi.fn().mockResolvedValueOnce({
        data: { id: "groq-response" },
        response: new Response(null, {
          headers: {
            "x-ratelimit-remaining-requests": "239",
          },
          status: 200,
        }),
      }),
    });

    await expect(invokeGroqChat(providerRequest)).resolves.toMatchObject({
      headers: expect.any(Headers),
      httpStatus: 200,
      result: { id: "groq-response" },
    });

    expect(mocks.Groq).toHaveBeenCalledWith({
      apiKey: "groq-key",
      maxRetries: 0,
    });
    expect(mocks.groqCreate).toHaveBeenCalledWith({
      messages: providerRequest.messages,
      model: providerRequest.model,
      temperature: providerRequest.temperature,
    });
  });

  it("configures the OpenRouter SDK without automatic retries", async () => {
    mocks.openRouterSend.mockResolvedValueOnce({ id: "openrouter-response" });

    await expect(invokeOpenRouterChat(providerRequest)).resolves.toMatchObject({
      httpStatus: null,
      result: { id: "openrouter-response" },
    });

    expect(mocks.OpenRouter).toHaveBeenCalledWith({
      apiKey: "openrouter-key",
      retryConfig: { strategy: "none" },
    });
    expect(mocks.openRouterSend).toHaveBeenCalledWith({
      chatRequest: {
        messages: providerRequest.messages,
        model: providerRequest.model,
        stream: false,
        temperature: providerRequest.temperature,
      },
    });
  });

  it("configures the Cerebras SDK without automatic retries", async () => {
    mocks.cerebrasCreate.mockReturnValueOnce({
      withResponse: vi.fn().mockResolvedValueOnce({
        data: { id: "cerebras-response" },
        response: new Response(null, {
          headers: {
            "x-ratelimit-remaining-requests": "119",
          },
          status: 200,
        }),
      }),
    });

    await expect(invokeCerebrasChat(providerRequest)).resolves.toMatchObject({
      headers: expect.any(Headers),
      httpStatus: 200,
      result: { id: "cerebras-response" },
    });

    expect(mocks.Cerebras).toHaveBeenCalledWith({
      apiKey: "cerebras-key",
      maxRetries: 0,
    });
    expect(mocks.cerebrasCreate).toHaveBeenCalledWith({
      messages: providerRequest.messages,
      model: providerRequest.model,
      temperature: providerRequest.temperature,
    });
  });
});
