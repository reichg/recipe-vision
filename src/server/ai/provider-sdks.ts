import Cerebras from "@cerebras/cerebras_cloud_sdk";
import { Mistral } from "@mistralai/mistralai";
import { OpenRouter } from "@openrouter/sdk";
import Groq from "groq-sdk";

import { getAiEnv, type LlmProviderName } from "@/server/config/env";
import { AppError } from "@/server/shared/errors";

type OpenAiCompatibleProvider = Exclude<LlmProviderName, "gemini">;

export type ProviderSdkHeaders = Headers | Record<string, string> | undefined;

export type ProviderSdkMessage = {
  role: "system" | "user";
  content: string;
};

export type ProviderSdkRequest = {
  model: string;
  messages: ProviderSdkMessage[];
  temperature: number;
};

export type ProviderSdkResponse = {
  result: unknown;
  headers?: ProviderSdkHeaders;
  httpStatus: number | null;
};

const NO_SDK_RETRIES = 0;
const NO_SDK_RETRY_CONFIG = {
  strategy: "none",
} as const;

let cachedMistralClient: Mistral | undefined;
let cachedGroqClient: Groq | undefined;
let cachedOpenRouterClient: OpenRouter | undefined;
let cachedCerebrasClient: Cerebras | undefined;

function createProviderNotConfiguredError(provider: OpenAiCompatibleProvider) {
  return new AppError({
    code: "LLM_PROVIDER_NOT_CONFIGURED",
    message: "Recipe extraction failed",
    statusCode: 500,
    cause: { provider },
  });
}

function getMistralClient() {
  const { MISTRAL_API_KEY } = getAiEnv();

  if (!MISTRAL_API_KEY) {
    throw createProviderNotConfiguredError("mistral");
  }

  cachedMistralClient ??= new Mistral({
    apiKey: MISTRAL_API_KEY,
    retryConfig: NO_SDK_RETRY_CONFIG,
  });

  return cachedMistralClient;
}

function getGroqClient() {
  const { GROQ_API_KEY } = getAiEnv();

  if (!GROQ_API_KEY) {
    throw createProviderNotConfiguredError("groq");
  }

  cachedGroqClient ??= new Groq({
    apiKey: GROQ_API_KEY,
    maxRetries: NO_SDK_RETRIES,
  });

  return cachedGroqClient;
}

function getOpenRouterClient() {
  const { OPENROUTER_API_KEY } = getAiEnv();

  if (!OPENROUTER_API_KEY) {
    throw createProviderNotConfiguredError("openrouter");
  }

  cachedOpenRouterClient ??= new OpenRouter({
    apiKey: OPENROUTER_API_KEY,
    retryConfig: NO_SDK_RETRY_CONFIG,
  });

  return cachedOpenRouterClient;
}

function getCerebrasClient() {
  const { CEREBRAS_API_KEY } = getAiEnv();

  if (!CEREBRAS_API_KEY) {
    throw createProviderNotConfiguredError("cerebras");
  }

  cachedCerebrasClient ??= new Cerebras({
    apiKey: CEREBRAS_API_KEY,
    maxRetries: NO_SDK_RETRIES,
  });

  return cachedCerebrasClient;
}

export async function invokeMistralChat(
  request: ProviderSdkRequest,
): Promise<ProviderSdkResponse> {
  const result = await getMistralClient().chat.complete({
    model: request.model,
    messages: request.messages,
    temperature: request.temperature,
  });

  return {
    result,
    httpStatus: null,
  };
}

export async function invokeGroqChat(
  request: ProviderSdkRequest,
): Promise<ProviderSdkResponse> {
  const { data, response } = await getGroqClient()
    .chat.completions.create({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
    })
    .withResponse();

  return {
    result: data,
    headers: response.headers,
    httpStatus: response.status,
  };
}

export async function invokeOpenRouterChat(
  request: ProviderSdkRequest,
): Promise<ProviderSdkResponse> {
  const result = await getOpenRouterClient().chat.send({
    chatRequest: {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      stream: false,
    },
  });

  return {
    result,
    httpStatus: null,
  };
}

export async function invokeCerebrasChat(
  request: ProviderSdkRequest,
): Promise<ProviderSdkResponse> {
  const { data, response } = await getCerebrasClient()
    .chat.completions.create({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
    })
    .withResponse();

  return {
    result: data,
    headers: response.headers,
    httpStatus: response.status,
  };
}

export function resetProviderSdkClients() {
  cachedMistralClient = undefined;
  cachedGroqClient = undefined;
  cachedOpenRouterClient = undefined;
  cachedCerebrasClient = undefined;
}
