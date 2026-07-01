// PASTE LOCATION: src/app/api/ai/analyze/route.ts (new file)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAnalyticsData } from "@/lib/analytics/get-analytics-data";
import { resolveDateRange, type RangeKey } from "@/lib/analytics/date-range";
import { runAIAnalysis, type AIFeature } from "@/lib/ai/analyze";

const VALID_FEATURES: AIFeature[] = ["insights", "risk", "delayedTasks", "suggestedSprint"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { feature, range } = (await req.json()) as { feature: AIFeature; range?: string };

  if (!VALID_FEATURES.includes(feature)) {
    return NextResponse.json({ success: false, message: "Unknown feature" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const { from, to } = resolveDateRange((range as RangeKey) ?? "7d");

  let data;
  try {
    data = await getAnalyticsData(tenantId, from, to);
  } catch (error) {
    console.error("[AI_ANALYZE_DB_ERROR]", error);
    return NextResponse.json({ success: false, message: "Could not load analytics data" }, { status: 500 });
  }

  try {
    const result = await runAIAnalysis(feature, data);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[AI_ANALYZE_ERROR]", error);
    return NextResponse.json({ success: false, message: "AI analysis failed" }, { status: 500 });
  }
}