import { prisma } from "@/lib/db/prisma";
import { rateLimited } from "./errors";

/**
 * Fixed-window rate limiting backed by Postgres.
 *
 * Serverless functions don't share memory, so an in-process counter would
 * reset on every cold start. One atomic upsert per check keeps the state
 * shared without adding infrastructure: the window restarts once `resetAt`
 * has passed, otherwise the count is incremented.
 */

export type Limit = { limit: number; windowSeconds: number };

export const limits = {
  signIn: { limit: 10, windowSeconds: 15 * 60 },
  signInPerIp: { limit: 50, windowSeconds: 15 * 60 },
  register: { limit: 5, windowSeconds: 60 * 60 },
  passwordResetRequest: { limit: 5, windowSeconds: 15 * 60 },
  passwordResetPerEmail: { limit: 3, windowSeconds: 60 * 60 },
  tokenRedemption: { limit: 10, windowSeconds: 15 * 60 },
  invitations: { limit: 30, windowSeconds: 60 * 60 },
  aiAnalysis: { limit: 20, windowSeconds: 60 * 60 },
} satisfies Record<string, Limit>;

/** Counts one attempt against `key` and reports whether it is within the limit. */
export async function hit(key: string, { limit, windowSeconds }: Limit) {
  const [row] = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}::double precision))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now()
        THEN now() + make_interval(secs => ${windowSeconds}::double precision)
        ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`;

  const retryAfterSeconds = Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000));
  return { allowed: row.count <= limit, retryAfterSeconds };
}

/** Throws a 429 when `key` has used up its allowance. */
export async function enforce(key: string, limit: Limit) {
  const { allowed, retryAfterSeconds } = await hit(key, limit);
  if (!allowed) throw rateLimited(retryAfterSeconds);
}

/** Best-effort client address for per-IP limits (Vercel sets X-Forwarded-For). */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Removes windows that ended more than a day ago; called by the daily cron. */
export function pruneExpired() {
  return prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
}
