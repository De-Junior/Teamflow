import { unauthorized } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { pruneExpired } from "@/lib/api/rate-limit";
import { resetDemoWorkspace } from "@/lib/demo-seed";
import { logger } from "@/lib/logger";

// Called daily by Vercel Cron (see vercel.json) so the public demo always has
// fresh, current-dated data and any visitor's changes are undone. It also
// clears out finished rate-limit windows.
export const maxDuration = 60;

export const GET = route("cron.reset_demo", async (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) throw unauthorized();

  const [demo, pruned] = await Promise.all([resetDemoWorkspace(), pruneExpired()]);
  logger.info("cron.reset_demo", { prunedRateLimits: pruned.count });
  return ok({ ...demo, prunedRateLimits: pruned.count });
});
