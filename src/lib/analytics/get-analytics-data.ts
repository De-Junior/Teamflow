// PASTE LOCATION: src/lib/analytics/get-analytics-data.ts
import { prisma } from "@/lib/db/prisma";
import { buildBuckets } from "@/lib/analytics/date-range";

export async function getAnalyticsData(tenantId: string, from: Date, to: Date) {
  const [
    projectCount,
    taskCount,
    doneTaskCount,
    activeUserRows,
    ,
    tasksCompletedInRange,
    projectsCreatedInRange,
    allTasksWithAssignee,
    allProjects,
  ] = await Promise.all([
    prisma.project.count({ where: { tenantId } }),
    prisma.task.count({ where: { tenantId } }),
    prisma.task.count({ where: { tenantId, status: "DONE" } }),

    prisma.auditLog.findMany({
      where: { tenantId, createdAt: { gte: from, lte: to } },
      select: { userId: true },
      distinct: ["userId"],
    }),

    prisma.task.findMany({
      where: { tenantId, createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
    }),

    prisma.task.findMany({
      where: { tenantId, status: "DONE", updatedAt: { gte: from, lte: to } },
      select: { updatedAt: true, createdAt: true },
    }),

    prisma.project.findMany({
      where: { tenantId, createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
    }),

    prisma.task.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        dueDate: true,
        assigneeId: true,
        assignee: { select: { name: true, email: true } },
      },
    }),

    prisma.project.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        tasks: { select: { status: true, dueDate: true } },
      },
    }),
  ]);

  const activeUserIds = activeUserRows.map((r: (typeof activeUserRows)[number]) => r.userId);
  const completionRate = taskCount === 0 ? 0 : Math.round((doneTaskCount / taskCount) * 100);

  const buckets = buildBuckets(from, to);

  const tasksCompletedSeries = buckets.map((bucket) => ({
    label: bucket.label,
    value: tasksCompletedInRange.filter(
      (t: (typeof tasksCompletedInRange)[number]) =>
        t.updatedAt >= bucket.start && t.updatedAt < bucket.end
    ).length,
  }));

  const projectsCreatedSeries = buckets.map((bucket) => ({
    label: bucket.label,
    value: projectsCreatedInRange.filter(
      (p: (typeof projectsCreatedInRange)[number]) =>
        p.createdAt >= bucket.start && p.createdAt < bucket.end
    ).length,
  }));

  const byAssignee = new Map<string, { name: string; total: number; completed: number }>();
  for (const task of allTasksWithAssignee) {
    if (!task.assigneeId) continue;
    const name = task.assignee?.name ?? task.assignee?.email ?? "Unknown";
    const entry = byAssignee.get(task.assigneeId) ?? { name, total: 0, completed: 0 };
    entry.total += 1;
    if (task.status === "DONE") entry.completed += 1;
    byAssignee.set(task.assigneeId, entry);
  }
  const teamProductivity = Array.from(byAssignee.values()).sort(
    (a: { total: number }, b: { total: number }) => b.total - a.total
  );

  const mostCompleted = [...teamProductivity]
    .sort((a: { completed: number }, b: { completed: number }) => b.completed - a.completed)
    .slice(0, 5);

  const completedWithDuration = allTasksWithAssignee
    .filter((t: (typeof allTasksWithAssignee)[number]) => t.status === "DONE")
    .map(
      (t: (typeof allTasksWithAssignee)[number]) =>
        t.updatedAt.getTime() - t.createdAt.getTime()
    );
  const avgCompletionMs =
    completedWithDuration.length === 0
      ? 0
      : completedWithDuration.reduce((sum: number, ms: number) => sum + ms, 0) /
        completedWithDuration.length;
  const avgCompletionDays = Math.round((avgCompletionMs / 86400000) * 10) / 10;

  const now = new Date();
  const slowestTasks = allTasksWithAssignee
    .filter((t: (typeof allTasksWithAssignee)[number]) => t.status !== "DONE")
    .map((t: (typeof allTasksWithAssignee)[number]) => ({
      id: t.id,
      title: t.title,
      assigneeName: t.assignee?.name ?? t.assignee?.email ?? "Unassigned",
      ageDays: Math.round((now.getTime() - t.createdAt.getTime()) / 86400000),
    }))
    .sort((a: { ageDays: number }, b: { ageDays: number }) => b.ageDays - a.ageDays)
    .slice(0, 5);

  const projectComparison = allProjects.map((project: (typeof allProjects)[number]) => {
    const total = project.tasks.length;
    const done = project.tasks.filter(
      (t: (typeof project.tasks)[number]) => t.status === "DONE"
    ).length;
    const overdue = project.tasks.filter(
      (t: (typeof project.tasks)[number]) =>
        t.status !== "DONE" && t.dueDate && t.dueDate < now
    ).length;
    const completionPct = total === 0 ? 0 : Math.round((done / total) * 100);
    const overduePct = total === 0 ? 0 : Math.round((overdue / total) * 100);
    const risk = Math.min(100, Math.round(overduePct * 0.8 + (100 - completionPct) * 0.2));

    return {
      id: project.id,
      name: project.name,
      totalTasks: total,
      completionPct,
      overduePct,
      risk,
    };
  });

  return {
    kpis: {
      projectCount,
      taskCount,
      completionRate,
      activeUserCount: activeUserIds.length,
    },
    charts: {
      tasksCompletedSeries,
      projectsCreatedSeries,
      teamProductivity,
    },
    teamPerformance: {
      mostCompleted,
      avgCompletionDays,
      slowestTasks,
    },
    projectComparison,
  };
}