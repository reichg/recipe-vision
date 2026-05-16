import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/server/shared/errors";

const env = vi.hoisted(() => ({
  OCRSPACE_API_KEY: "ocr-key",
  OCRSPACE_DAILY_LIMIT: 3,
  OCRSPACE_HOURLY_LIMIT: 2,
  OCR_MAX_FILE_SIZE_BYTES: 65_536,
  OCR_TIMEOUT_MS: 1_000,
}));

const mocks = vi.hoisted(() => ({
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
  getAiEnv: () => env,
}));

import {
  ocrSpaceExtractText,
  prepareImageForOcr,
  reserveOcrSpaceQuota,
  resetOcrRateLimitState,
} from "./ocr";

async function createColorImageFile() {
  const buffer = await sharp({
    create: {
      background: { b: 220, g: 120, r: 40 },
      channels: 3,
      height: 512,
      width: 512,
    },
  })
    .png()
    .toBuffer();

  return new File([new Uint8Array(buffer)], "recipe.png", {
    type: "image/png",
  });
}

describe("ocr", () => {
  beforeEach(() => {
    env.OCRSPACE_DAILY_LIMIT = 3;
    env.OCRSPACE_HOURLY_LIMIT = 2;
    env.OCR_MAX_FILE_SIZE_BYTES = 65_536;
    env.OCR_TIMEOUT_MS = 1_000;
    resetOcrRateLimitState();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    resetOcrRateLimitState();
  });

  it("prepares OCR uploads as black-and-white png files within the OCR size cap", async () => {
    const preparedFile = await prepareImageForOcr(await createColorImageFile());
    const preparedBuffer = Buffer.from(await preparedFile.arrayBuffer());
    const rawImage = await sharp(preparedBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    expect(preparedFile.type).toBe("image/png");
    expect(preparedFile.name).toBe("recipe-ocr.png");
    expect(preparedFile.size).toBeLessThanOrEqual(env.OCR_MAX_FILE_SIZE_BYTES);

    for (const value of new Set(rawImage.data)) {
      expect([0, 255]).toContain(value);
    }
  });

  it("enforces OCR.Space hourly and daily request quotas", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-16T00:00:00.000Z"));

    expect(() => reserveOcrSpaceQuota(2)).not.toThrow();

    try {
      reserveOcrSpaceQuota(1);
      throw new Error("Expected hourly OCR quota reservation to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);

      if (error instanceof AppError) {
        expect(error.code).toBe("OCR_RATE_LIMITED");
        expect(error.statusCode).toBe(503);
      }
    }

    vi.setSystemTime(new Date("2026-05-16T01:00:01.000Z"));

    expect(() => reserveOcrSpaceQuota(1)).not.toThrow();

    try {
      reserveOcrSpaceQuota(1);
      throw new Error("Expected daily OCR quota reservation to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);

      if (error instanceof AppError) {
        expect(error.code).toBe("OCR_RATE_LIMITED");
        expect(error.statusCode).toBe(503);
      }
    }
  });

  it("maps OCR.Space rate-limit responses to a safe public error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ErrorMessage: ["Rate limit exceeded"],
            IsErroredOnProcessing: true,
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
          },
        ),
      ),
    );

    await expect(
      ocrSpaceExtractText(await createColorImageFile()),
    ).rejects.toMatchObject({
      code: "OCR_RATE_LIMITED",
      message:
        "OCR service is temporarily rate limited. Please try again later.",
      statusCode: 503,
    });
  });

  it("logs OCR provider telemetry from rate-limit headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("", {
          headers: {
            "Retry-After": "30",
            "X-RateLimit-Limit": "500",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": "45",
          },
          status: 429,
          statusText: "Too Many Requests",
        }),
      ),
    );

    await expect(
      ocrSpaceExtractText(await createColorImageFile()),
    ).rejects.toMatchObject({
      code: "OCR_RATE_LIMITED",
      statusCode: 503,
    });

    expect(mocks.logger.info).toHaveBeenCalledWith(
      "OCR provider request telemetry",
      expect.objectContaining({
        provider: "ocr-space",
        operation: "parseImage",
        transport: "fetch",
        httpStatus: 429,
        responseReceived: true,
        rateLimit: expect.objectContaining({
          source: "headers",
          status: "limited",
          limit: 500,
          remaining: 0,
          resetSeconds: 45,
          retryAfterSeconds: 30,
        }),
      }),
    );
  });
});
