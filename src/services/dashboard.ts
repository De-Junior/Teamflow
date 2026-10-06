import { TaskStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/db/tenant";

/** Everything the dashboard shows, loaded in one round of parallel queries. */

const DAY = 24 * 60 * 60 * 1000;
const STATUS_LABEL: Record<string, string> = {
  BACKLOG: "Backlog", TODO: "To do", IN_PROGRESS: "In progress", REVIEW: "Review", DONE: "Done",
};

export type ActivityItem = {
  id: string;
  actor: string;
  verb: string;
  target: { label: string; href?: string } | null;
  createdAt: string;
};

export async function getDashboard(ctx: TenantContext) {
  const { tenantId, userId } = ctx;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inAWeek = new Date(startOfToday.getTime() + 7 * DAY);
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY);
  const open = { tenantId, status: { not: TaskStatus.DONE } } satisfies Prisma.TaskWhereInput;

  const [
    organization,
    subscription,
    openTasks,
    overdueTasks,
    dueThisWeek,
    completedThisWeek,
    completedLastWeek,
    myTasks,
    deadlines,
    projects,
    invitations,
    auditLogs,
  ] = await Promise.all([
    prisma.organization.findUnique({ where: { id: tenantId }, select: { name: true } }),
    prisma.subscription.findUnique({ where: { organizationId: tenantId }, select: { plan: true } }),
    prisma.task.count({ where: open }),
    prisma.task.count({ where: { ...open, dueDate: { lt: startOfToday } } }),
    prisma.task.count({ where: { ...open, dueDate: { gte: startOfToday, lt: inAWeek } } }),
    prisma.task.count({ where: { tenantId, completedAt: { gte: weekAgo } } }),
    prisma.task.count({ where: { tenantId, completedAt: { gte: twoWeeksAgo, lt: weekAgo } } }),

    // Overdue first, then soonest due, then undated.
    prisma.task.findMany({
      where: { ...open, assigneeId: userId },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
      take: 8,
      select: { id: true, title: true, dueDate: true, project: { select: { id: true, name: true } } },
    }),
    prisma.task.findMany({
      where: { ...open, dueDate: { gte: startOfToday, lt: inAWeek } },
      orderBy: { dueDate: "asc" },
      take: 10,
      select: { id: true, title: true, dueDate: true, project: { select: { id: true, name: true } } },
    }),
    prisma.project.findMany({
      where: { tenantId, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: { id: true, name: true, status: true, dueDate: true, _count: { select: { members: true } } },
    }),
    prisma.invitation.findMany({
      where: { tenantId, status: "PENDING", expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true },
    }),
    prisma.auditLog.findMany({
      where: { tenantId, entityType: { in: ["Task", "Project", "Membership", "Invitation", "Organization"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, action: true, entityType: true, entityId: true, metadata: true, createdAt: true, user: { select: { name: true, email: true } } },
    }),
  ]);

  // Task counts per project with one grouped query instead of loading every task.
  const projectIds = projects.map((p) => p.id);
  const taskCounts = projectIds.length
    ? await prisma.task.groupBy({ by: ["projectId", "status"], where: { tenantId, projectId: { in: projectIds } }, _count: true })
    : [];

  const recentProjects = projects.map((p) => {
    const rows = taskCounts.filter((c) => c.projectId === p.id);
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      dueDate: p.dueDate?.toISOString() ?? null,
      totalTasks: rows.reduce((sum, r) => sum + r._count, 0),
      completedTasks: rows.find((r) => r.status === TaskStatus.DONE)?._count ?? 0,
      memberCount: p._count.members,
    };
  });

  return {
    organizationName: organization?.name ?? "TeamFlow",
    plan: subscription?.plan ?? "FREE",
    kpis: { openTasks, overdueTasks, dueThisWeek, completedThisWeek, completedLastWeek },
    myTasks: myTasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate?.toISOString() ?? null,
      projectId: t.project.id,
      projectName: t.project.name,
      isOverdue: t.dueDate ? t.dueDate < startOfToday : false,
    })),
    deadlines: deadlines.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate!.toISOString(),
      projectId: t.project.id,
      projectName: t.project.name,
    })),
    recentProjects,
    invitations,
    activity: await describeActivity(tenantId, auditLogs),
  };
}

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  user: { name: string | null; email: string };
};

/** Turns audit rows into readable sentences, linking to tasks and projects that still exist. */
async function describeActivity(tenantId: string, rows: AuditRow[]): Promise<ActivityItem[]> {
  const idsOf = (type: string) => [...new Set(rows.filter((r) => r.entityType === type).map((r) => r.entityId))];
  const [tasks, projects] = await Promise.all([
    prisma.task.findMany({ where: { tenantId, id: { in: idsOf("Task") } }, select: { id: true, title: true, projectId: true } }),
    prisma.project.findMany({ where: { tenantId, id: { in: idsOf("Project") } }, select: { id: true, name: true } }),
  ]);
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const projectById = new Map(projects.map((p) => [p.id, p]));

  return rows.map((row) => {
    const meta = (row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {}) as Record<string, unknown>;
    let verb = `${row.action.toLowerCase().replace("_", " ")} a ${row.entityType.toLowerCase()}`;
    let target: ActivityItem["target"] = null;

    if (row.entityType === "Task") {
      const task = taskById.get(row.entityId);
      const label = task?.title ?? (typeof meta.title === "string" ? meta.title : "a task");
      target = { label, href: task ? `/projects/${task.projectId}` : undefined };
      if (row.action === "CREATED") verb = "created";
      else if (row.action === "DELETED") verb = "deleted";
      else if (meta.status === "DONE") verb = "completed";
      else if (typeof meta.status === "string") verb = `moved to ${STATUS_LABEL[meta.status] ?? meta.status}`;
      else if ("assigneeId" in meta) verb = meta.assigneeId ? "reassigned" : "unassigned";
      else verb = "updated";
    } else if (row.entityType === "Project") {
      const project = projectById.get(row.entityId);
      const label = project?.name ?? (typeof meta.name === "string" ? meta.name : "a project");
      target = { label, href: project ? `/projects/${project.id}` : undefined };
      if (row.action === "CREATED") verb = meta.duplicatedFrom ? "duplicated a project as" : "created project";
      else if (row.action === "DELETED") verb = "deleted project";
      else if (meta.status === "ARCHIVED") verb = "archived";
      else verb = "updated";
    } else if (row.entityType === "Invitation") {
      if (row.action === "INVITED") {
        verb = "invited";
        target = { label: typeof meta.email === "string" ? meta.email : "a new member" };
      } else verb = "revoked an invitation";
    } else if (row.entityType === "Membership") {
      verb = row.action === "ROLE_CHANGED"
        ? `changed a member's role${typeof meta.to === "string" ? ` to ${meta.to.toLowerCase()}` : ""}`
        : "removed a member";
    } else if (row.entityType === "Organization") {
      verb = meta.ownershipTransferredTo ? "transferred ownership of the organization" : "updated the organization";
    }

    return { id: row.id, actor: row.user.name ?? row.user.email, verb, target, createdAt: row.createdAt.toISOString() };
  });
}
