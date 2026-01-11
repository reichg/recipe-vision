// lib/db-ready.ts
import { prisma } from "../prisma";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

export async function waitForDatabaseReady() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;

      if (attempt > 1) {
        console.info("[DB] Database is ready", { attempt });
      }

      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      console.warn("[DB] Connection attempt failed", {
        attempt,
        message,
      });

      if (attempt === MAX_RETRIES) {
        console.error("[DB] Database failed to start after retries");
        throw err;
      }

      const delay = BASE_DELAY_MS * attempt;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
