import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError, getPublicError } from "./errors";

type HeaderBag = Headers | Record<string, string> | null | undefined;

const RATE_LIMIT_HEADER_NAMES = {
  limit: ["ratelimit-limit", "x-ratelimit-limit"],
  remaining: ["ratelimit-remaining", "x-ratelimit-remaining"],
  reset: ["ratelimit-reset", "x-ratelimit-reset"],
  requestLimit: ["x-ratelimit-limit-requests"],
  requestRemaining: ["x-ratelimit-remaining-requests"],
  requestReset: ["x-ratelimit-reset-requests"],
  retryAfter: ["retry-after"],
  tokenLimit: ["x-ratelimit-limit-tokens"],
  tokenRemaining: ["x-ratelimit-remaining-tokens"],
  tokenReset: ["x-ratelimit-reset-tokens"],
} as const;

const ALL_RATE_LIMIT_HEADER_NAMES = [
  ...RATE_LIMIT_HEADER_NAMES.limit,
  ...RATE_LIMIT_HEADER_NAMES.remaining,
  ...RATE_LIMIT_HEADER_NAMES.reset,
  ...RATE_LIMIT_HEADER_NAMES.requestLimit,
  ...RATE_LIMIT_HEADER_NAMES.requestRemaining,
  ...RATE_LIMIT_HEADER_NAMES.requestReset,
  ...RATE_LIMIT_HEADER_NAMES.retryAfter,
  ...RATE_LIMIT_HEADER_NAMES.tokenLimit,
  ...RATE_LIMIT_HEADER_NAMES.tokenRemaining,
  ...RATE_LIMIT_HEADER_NAMES.tokenReset,
] as const;

export type RateLimitTelemetry = {
  source: "headers" | "unavailable";
  status: "limited" | "ok" | "unknown";
  limit: number | null;
  remaining: number | null;
  resetSeconds: number | null;
  requestLimit: number | null;
  requestRemaining: number | null;
  requestResetSeconds: number | null;
  retryAfterSeconds: number | null;
  tokenLimit: number | null;
  tokenRemaining: number | null;
  tokenResetSeconds: number | null;
};

function normalizeHeaders(headers: HeaderBag) {
  const normalizedHeaders: Record<string, string> = {};

  if (!headers) {
    return normalizedHeaders;
  }

  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    headers.forEach((value, key) => {
      normalizedHeaders[key.toLowerCase()] = value.trim();
    });

    return normalizedHeaders;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      normalizedHeaders[key.toLowerCase()] = value.trim();
    }
  }

  return normalizedHeaders;
}

function getHeaderValue(
  normalizedHeaders: Record<string, string>,
  headerNames: readonly string[],
) {
  for (const headerName of headerNames) {
    const headerValue = normalizedHeaders[headerName];

    if (headerValue) {
      return headerValue;
    }
  }

  return undefined;
}

function parseCountHeader(value: string | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  const parsedValue = Number(match[0]);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return Math.trunc(parsedValue);
}

function parseDurationSeconds(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (/^\d+(?:\.\d+)?(?:;.*)?$/.test(trimmedValue)) {
    const leadingNumber = trimmedValue.match(/^\d+(?:\.\d+)?/);
    const parsedValue = leadingNumber ? Number(leadingNumber[0]) : Number.NaN;

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      return null;
    }

    return Math.ceil(parsedValue);
  }

  const compactValue = trimmedValue.replace(/\s+/g, "");
  const durationPattern = /(\d+(?:\.\d+)?)(ms|s|m|h|d)/g;
  let matchedText = "";
  let totalMilliseconds = 0;

  for (const match of compactValue.matchAll(durationPattern)) {
    const amount = Number(match[1]);

    if (!Number.isFinite(amount) || amount < 0) {
      return null;
    }

    matchedText += match[0];

    switch (match[2]) {
      case "ms":
        totalMilliseconds += amount;
        break;
      case "s":
        totalMilliseconds += amount * 1_000;
        break;
      case "m":
        totalMilliseconds += amount * 60_000;
        break;
      case "h":
        totalMilliseconds += amount * 3_600_000;
        break;
      case "d":
        totalMilliseconds += amount * 86_400_000;
        break;
    }
  }

  if (!matchedText || matchedText.length !== compactValue.length) {
    return null;
  }

  return Math.max(0, Math.ceil(totalMilliseconds / 1_000));
}

function parseRetryAfterSeconds(value: string | undefined, now = Date.now()) {
  const durationSeconds = parseDurationSeconds(value);

  if (durationSeconds !== null) {
    return durationSeconds;
  }

  if (!value) {
    return null;
  }

  const retryAfterAt = Date.parse(value);

  if (Number.isNaN(retryAfterAt)) {
    return null;
  }

  return Math.max(0, Math.ceil((retryAfterAt - now) / 1_000));
}

export function createRateLimitTelemetry(
  headers: HeaderBag,
  httpStatus?: number,
): RateLimitTelemetry {
  const normalizedHeaders = normalizeHeaders(headers);
  const limit = parseCountHeader(
    getHeaderValue(normalizedHeaders, RATE_LIMIT_HEADER_NAMES.limit),
  );
  const remaining = parseCountHeader(
    getHeaderValue(normalizedHeaders, RATE_LIMIT_HEADER_NAMES.remaining),
  );
  const resetSeconds = parseDurationSeconds(
    getHeaderValue(normalizedHeaders, RATE_LIMIT_HEADER_NAMES.reset),
  );
  const requestLimit = parseCountHeader(
    getHeaderValue(normalizedHeaders, RATE_LIMIT_HEADER_NAMES.requestLimit),
  );
  const requestRemaining = parseCountHeader(
    getHeaderValue(normalizedHeaders, RATE_LIMIT_HEADER_NAMES.requestRemaining),
  );
  const requestResetSeconds = parseDurationSeconds(
    getHeaderValue(normalizedHeaders, RATE_LIMIT_HEADER_NAMES.requestReset),
  );
  const retryAfterSeconds = parseRetryAfterSeconds(
    getHeaderValue(normalizedHeaders, RATE_LIMIT_HEADER_NAMES.retryAfter),
  );
  const tokenLimit = parseCountHeader(
    getHeaderValue(normalizedHeaders, RATE_LIMIT_HEADER_NAMES.tokenLimit),
  );
  const tokenRemaining = parseCountHeader(
    getHeaderValue(normalizedHeaders, RATE_LIMIT_HEADER_NAMES.tokenRemaining),
  );
  const tokenResetSeconds = parseDurationSeconds(
    getHeaderValue(normalizedHeaders, RATE_LIMIT_HEADER_NAMES.tokenReset),
  );
  const hasRateLimitHeaders = ALL_RATE_LIMIT_HEADER_NAMES.some(
    (headerName) => normalizedHeaders[headerName] !== undefined,
  );
  const hasParsedRateLimitTelemetry = [
    limit,
    remaining,
    resetSeconds,
    requestLimit,
    requestRemaining,
    requestResetSeconds,
    retryAfterSeconds,
    tokenLimit,
    tokenRemaining,
    tokenResetSeconds,
  ].some((value) => value !== null);
  const status =
    httpStatus === 429 ||
    retryAfterSeconds !== null ||
    remaining === 0 ||
    requestRemaining === 0 ||
    tokenRemaining === 0
      ? "limited"
      : hasParsedRateLimitTelemetry
        ? "ok"
        : "unknown";

  return {
    source: hasRateLimitHeaders ? "headers" : "unavailable",
    status,
    limit,
    remaining,
    resetSeconds,
    requestLimit,
    requestRemaining,
    requestResetSeconds,
    retryAfterSeconds,
    tokenLimit,
    tokenRemaining,
    tokenResetSeconds,
  };
}

function serializeUnknownError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return { error };
}

export function createErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof ZodError) {
    logger.warn("Request validation failed", {
      issues: error.issues.map(({ message, path }) => ({ message, path })),
    });
  } else if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error(error.message, {
        code: error.code,
        cause: serializeUnknownError(error.cause),
      });
    }
  } else {
    logger.error(fallbackMessage, serializeUnknownError(error));
  }

  const { message, statusCode } = getPublicError(error, fallbackMessage);

  return NextResponse.json({ error: message }, { status: statusCode });
}
