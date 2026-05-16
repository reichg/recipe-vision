import { GoogleGenAI } from "@google/genai";

import { getAiEnv } from "@/server/config/env";

let cachedClient: GoogleGenAI | undefined;

export function getGeminiClient() {
  const { GEMINI_API_KEY } = getAiEnv();

  cachedClient ??= new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  return cachedClient;
}

export function resetGeminiClient() {
  cachedClient = undefined;
}
