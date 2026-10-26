import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// One PrismaClient per server process. `next dev` re-imports modules on every
// change, so the client is parked on globalThis there to avoid opening a new
// connection pool each time.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — required for the activity log.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** The shared database client. Created on first use, not at import time. */
export function getDb(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}
