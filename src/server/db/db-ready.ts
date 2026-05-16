import { logger } from "@/lib/logger";

import { prisma } from "./prisma";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

function wait(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function waitForDatabaseReady() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;

      if (attempt > 1) {
        logger.info("Database is ready", { attempt });
      }

      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      logger.warn("Database connection attempt failed", {
        attempt,
        message,
      });

      if (attempt === MAX_RETRIES) {
        logger.error("Database failed to become ready", { attempt });
        throw error;
      }

      await wait(BASE_DELAY_MS * attempt);
    }
  }
}
