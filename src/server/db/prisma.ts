import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../../generated/prisma/client";

import { getDatabaseEnv } from "@/server/config/env";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const { DATABASE_URL } = getDatabaseEnv();

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "info", "warn", "query"]
        : ["error", "warn"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
