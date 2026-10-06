import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { enforce, limits } from "@/lib/api/rate-limit";
import { parseBody } from "@/lib/api/request";
import { requirePermission } from "@/lib/api/session";
import { getAnalyticsData } from "@/lib/analytics/get-analytics-data";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { runAIAnalysis } from "@/lib/ai/analyze";
import { logger } from "@/lib/logger";

const analyzeSchema = z.object({
  feature: z.enum(["insights", "risk", "delayedTasks", "suggestedSprint"], { message: "Unknown analysis." }),
  range: z.enum(["7d", "30d", "quarter", "year"]).default("7d"),
});

/**
 * AI calls cost money per request, so they're limited to roles that can see
 * analytics and capped per organization.
 */
export const POST = route("ai.analyze", async (req) => {
  const actor = await requirePermission("analytics:view");
  const { feature, range } = await parseBody(req, analyzeSchema);
  await enforce(`ai:${actor.tenant.organizationId}`, limits.aiAnalysis);

  const { from, to } = resolveDateRange(range);
  const data = await getAnalyticsData(actor.tenant.tenantId, from, to);

  try {
    return ok(await runAIAnalysis(feature, data));
  } catch (error) {
    // The model is an external dependency; report it as unavailable, not as our bug.
    logger.error("ai.analysis_failed", { feature, error });
    throw new ApiError(502, "internal_error", "The AI service didn't respond. Try again in a minute.");
  }
});
