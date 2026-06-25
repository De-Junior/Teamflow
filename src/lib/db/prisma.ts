import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 removed the built-in query engine — PrismaClient must always be
// constructed with a driver adapter now. PrismaPg wraps the standard `pg`
// driver so this still works against any Postgres instance (Neon, Docker,
// local install, etc.) via DATABASE_URL.
//
// Known Prisma 7 issue: PrismaPg's `connectionString` option doesn't always
// honor `sslmode=require` in the URL's query string against SSL-required
// hosts like Neon (prisma/prisma#29252). Passing `ssl` explicitly avoids it.
// Local Postgres (e.g. Docker) typically doesn't need/support SSL, so this
// only applies when the URL contains sslmode=require.
const connectionString = process.env.DATABASE_URL;
const needsSsl = connectionString?.includes("sslmode=require") ?? false;

const adapter = new PrismaPg({
  connectionString,
  ...(needsSsl ? { ssl: { rejectUnauthorized: true } } : {}),
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
