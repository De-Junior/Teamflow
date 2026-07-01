// PASTE LOCATION: src/app/(dashboard)/analytics/page.tsx
import { auth } from "@/lib/auth";
import { resolveDateRange, type RangeKey } from "@/lib/analytics/date-range";
import { getAnalyticsData } from "@/lib/analytics/get-analytics-data";
import { KpiCards } from "@/components/analytics/kpi-cards";
import { DateRangeFilter } from "@/components/analytics/date-range-filter";
import { TrendChart } from "@/components/analytics/trend-chart";
import { TeamProductivityChart } from "@/components/analytics/team-productivity-chart";
import { TeamPerformance } from "@/components/analytics/team-performance";
import { ProjectComparison } from "@/components/analytics/project-comparison";
import { ExportButton } from "@/components/analytics/export-button";
import { AIInsightsPanel } from "@/components/analytics/ai-insights-panel";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const tenantId = session!.user.tenantId;

  const rangeKey = (params.range as RangeKey) ?? "7d";
  const { from, to, label } = resolveDateRange(rangeKey, params.from, params.to);

  let dbError = false;
  let data: Awaited<ReturnType<typeof getAnalyticsData>> | null = null;

  try {
    data = await getAnalyticsData(tenantId, from, to);
  } catch (error) {
    console.error("[ANALYTICS_DB_ERROR]", error);
    dbError = true;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        {data && (
          <ExportButton
            filename="teamflow-analytics"
            rows={data.projectComparison.map((p: (typeof data.projectComparison)[number]) => ({
              project: p.name,
              tasks: p.totalTasks,
              completion_pct: p.completionPct,
              overdue_pct: p.overduePct,
              risk_score: p.risk,
            }))}
          />
        )}
      </div>

      <DateRangeFilter />

      {dbError || !data ? (
        <p className="text-sm text-destructive">
          Could not reach the database — check your connection and refresh.
        </p>
      ) : (
        <>
          <KpiCards
            projectCount={data.kpis.projectCount}
            taskCount={data.kpis.taskCount}
            completionRate={data.kpis.completionRate}
            activeUserCount={data.kpis.activeUserCount}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TrendChart title="Tasks completed" data={data.charts.tasksCompletedSeries} />
            <TrendChart
              title="Projects created"
              data={data.charts.projectsCreatedSeries}
              color="var(--status-in-progress)"
            />
          </div>

          <TeamProductivityChart data={data.charts.teamProductivity} />

          <TeamPerformance data={data.teamPerformance} />

          <ProjectComparison projects={data.projectComparison} />
          <AIInsightsPanel range={rangeKey} />
        </>
      )}
    </div>
  );
}