import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// The Prisma CLI doesn't read .env files on its own. Load them the same way
// `next dev` does, so DATABASE_URL in .env.local works for both.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
