import { logger } from "@/lib/logger";
import type { LlmModelCandidate, LlmProviderName } from "@/server/config/env";
import { AppError } from "@/server/shared/errors";

const DEFAULT_PROVIDER_COOLDOWN_SECONDS = 60;
const LLM_RATE_LIMITED_MESSAGE =
  "Recipe extraction is temporarily rate limited. Please try again later.";

type BlockedLlmProvider = {
  provider: LlmProviderName;
  retryAfterSeconds: number;
};

let nextCandidateIndex = 0;
let providerCooldowns = new Map<LlmProviderName, number>();

function findCandidateIndex(
  candidates: readonly LlmModelCandidate[],
  candidate: LlmModelCandidate,
) {
  return candidates.findIndex(
    (entry) =>
      entry.provider === candidate.provider && entry.model === candidate.model,
  );
}

function clearExpiredProviderCooldowns(now: number) {
  for (const [provider, availableAt] of providerCooldowns.entries()) {
    if (availableAt <= now) {
      providerCooldowns.delete(provider);
    }
  }
}

function createBlockedProviders(
  blockedProviderEntries: ReadonlyMap<LlmProviderName, number>,
  now: number,
): BlockedLlmProvider[] {
  return Array.from(blockedProviderEntries.entries())
    .map(([provider, availableAt]) => ({
      provider,
      retryAfterSeconds: Math.max(1, Math.ceil((availableAt - now) / 1_000)),
    }))
    .sort((left, right) => left.retryAfterSeconds - right.retryAfterSeconds);
}

export function getLlmCandidateExecutionOrder(
  candidates: readonly LlmModelCandidate[],
  now = Date.now(),
) {
  clearExpiredProviderCooldowns(now);

  if (candidates.length === 0) {
    return {
      blockedProviders: [] as BlockedLlmProvider[],
      candidates: [] as LlmModelCandidate[],
    };
  }

  const startIndex = nextCandidateIndex % candidates.length;
  const availableCandidates: LlmModelCandidate[] = [];
  const blockedProviders = new Map<LlmProviderName, number>();

  for (let offset = 0; offset < candidates.length; offset += 1) {
    const candidate = candidates[(startIndex + offset) % candidates.length];
    const availableAt = providerCooldowns.get(candidate.provider) ?? 0;

    if (availableAt <= now) {
      availableCandidates.push(candidate);
      continue;
    }

    blockedProviders.set(
      candidate.provider,
      Math.max(blockedProviders.get(candidate.provider) ?? 0, availableAt),
    );
  }

  return {
    blockedProviders: createBlockedProviders(blockedProviders, now),
    candidates: availableCandidates,
  };
}

export function markLlmCandidateSuccess(
  candidates: readonly LlmModelCandidate[],
  candidate: LlmModelCandidate,
  now = Date.now(),
) {
  clearExpiredProviderCooldowns(now);

  if (candidates.length === 0) {
    return;
  }

  providerCooldowns.delete(candidate.provider);

  const candidateIndex = findCandidateIndex(candidates, candidate);

  nextCandidateIndex =
    candidateIndex === -1 ? 0 : (candidateIndex + 1) % candidates.length;
}

export function markLlmProviderRateLimited(
  candidates: readonly LlmModelCandidate[],
  candidate: LlmModelCandidate,
  retryAfterSeconds: number | null,
  now = Date.now(),
) {
  clearExpiredProviderCooldowns(now);

  if (candidates.length === 0) {
    return;
  }

  const candidateIndex = findCandidateIndex(candidates, candidate);
  const cooldownSeconds = Math.max(
    1,
    retryAfterSeconds ?? DEFAULT_PROVIDER_COOLDOWN_SECONDS,
  );
  const availableAt = now + cooldownSeconds * 1_000;

  providerCooldowns.set(
    candidate.provider,
    Math.max(providerCooldowns.get(candidate.provider) ?? 0, availableAt),
  );
  nextCandidateIndex =
    candidateIndex === -1 ? 0 : (candidateIndex + 1) % candidates.length;

  logger.warn("LLM provider marked temporarily unavailable", {
    provider: candidate.provider,
    model: candidate.model,
    retryAfterSeconds: cooldownSeconds,
  });
}

export function createLlmProvidersRateLimitedError(
  blockedProviders: BlockedLlmProvider[],
) {
  return new AppError({
    code: "LLM_PROVIDER_RATE_LIMITED",
    message: LLM_RATE_LIMITED_MESSAGE,
    statusCode: 503,
    cause:
      blockedProviders.length > 0
        ? {
            blockedProviders,
          }
        : undefined,
  });
}

export function resetLlmProviderRotationState() {
  nextCandidateIndex = 0;
  providerCooldowns = new Map<LlmProviderName, number>();
}
