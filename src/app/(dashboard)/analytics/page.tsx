// PASTE LOCATION: src/app/(dashboard)/analytics/page.tsx (create new file)
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, CheckCircle2, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  BACKLOG: "Backlog", TODO: "To do", IN_PROGRESS: "In progress",
  REVIEW: "Review",  DONE: "Done",
};
const STATUS_COLOR: Record<string, string> = {
  BACKLOG: "bg-slate-400", TODO: "bg-blue-400", IN_PROGRESS: "bg-yellow-400",
  REVIEW: "bg-purple-400", DONE: "bg-green-500",
};
const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent",
};
const PRIORITY_COLOR: Record<string, string> = {
  LOW:    "bg-[var(--priority-low)]",
  MEDIUM: "bg-[var(--priority-medium)]",
  HIGH:   "bg-[var(--priority-high)]",
  URGENT: "bg-[var(--priority-urgent)]",
};
const ACTION_LABEL: Record<string, string> = {
  CREATED: "created", UPDATED: "updated", DELETED: "deleted",
  ARCHIVED: "archived", RESTORED: "restored", INVITED: "invited",
  ROLE_CHANGED: "changed role in", LOGIN: "logged in", LOGOUT: "logged out",
};

export default async function AnalyticsPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId;
  // eslint-disable-next-line react-hooks/purity
  const weekAgo  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  let totalProjects     = 0;
  let totalTasks        = 0;
  let memberCount       = 0;
  let completedThisWeek = 0;
  let tasksByStatus:   { status: string;   _count: { _all: number } }[] = [];
  let tasksByPriority: { priority: string; _count: { _all: number } }[] = [];
  let recentActivity:  Array<{
    id: string; action: string; entityType: string; createdAt: Date;
    user: { name: string | null; email: string };
  }> = [];

  try {
    [totalProjects, totalTasks, memberCount, completedThisWeek,
     tasksByStatus, tasksByPriority, recentActivity] = await Promise.all([
      prisma.project.count({ where: { tenantId } }),
      prisma.task.count({ where: { tenantId } }),
      prisma.membership.count({ where: { tenantId } }),
      prisma.task.count({ where: { tenantId, status: "DONE", updatedAt: { gte: weekAgo } } }),
      prisma.task.groupBy({ by: ["status"],   where: { tenantId }, _count: { _all: true } }),
      prisma.task.groupBy({ by: ["priority"], where: { tenantId }, _count: { _all: true } }),
      prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);
  } catch { /* DB unavailable — show zeros */ }

  const stats = [
    { label: "Total projects",       value: totalProjects,     icon: FolderKanban  },
    { label: "Total tasks",          value: totalTasks,        icon: CheckCircle2  },
    { label: "Team members",         value: memberCount,       icon: Users         },
    { label: "Completed this week",  value: completedThisWeek, icon: TrendingUp    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your organization&apos;s activity.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent">
                <Icon className="size-4 text-accent-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tasks by status */}
        <Card>
          <CardHeader><CardTitle className="text-base">Tasks by status</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {totalTasks === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks yet.</p>
            ) : (
              ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"].map((status) => {
                const count = tasksByStatus.find((t) => t.status === status)?._count._all ?? 0;
                const pct   = Math.round((count / totalTasks) * 100);
                return (
                  <div key={status} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground">{STATUS_LABEL[status]}</span>
                      <span className="text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all", STATUS_COLOR[status])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Tasks by priority */}
        <Card>
          <CardHeader><CardTitle className="text-base">Tasks by priority</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {totalTasks === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks yet.</p>
            ) : (
              ["LOW", "MEDIUM", "HIGH", "URGENT"].map((priority) => {
                const count = tasksByPriority.find((t) => t.priority === priority)?._count._all ?? 0;
                const pct   = Math.round((count / totalTasks) * 100);
                return (
                  <div key={priority} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground">{PRIORITY_LABEL[priority]}</span>
                      <span className="text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all", PRIORITY_COLOR[priority])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {recentActivity.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-4 py-2.5">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{log.user.name ?? log.user.email}</span>{" "}
                    {ACTION_LABEL[log.action] ?? log.action.toLowerCase()}{" "}
                    <span className="text-muted-foreground">
                      {log.entityType.toLowerCase()}
                    </span>
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleDateString(undefined, {
                      month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}