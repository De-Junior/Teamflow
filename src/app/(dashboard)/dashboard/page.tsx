// PASTE LOCATION: src/app/(dashboard)/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import type { Role } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { QuickActions } from "@/components/dashboard/widgets/quick-actions";
import { OrgStatisticsWidget } from "@/components/dashboard/widgets/org-statistics";
import { MyTasksWidget } from "@/components/dashboard/widgets/my-tasks";
import { WelcomeBanner } from "@/components/dashboard/widgets/welcome-banner";
import { UpcomingDeadlinesWidget } from "@/components/dashboard/widgets/upcoming-deadlines";
import { RecentProjectsWidget } from "@/components/dashboard/widgets/recent-projects";
import { OpenInvitationsWidget } from "@/components/dashboard/widgets/open-invitations";
import { ComingSoonWidget } from "@/components/dashboard/widgets/coming-soon";
import { FolderKanban, WifiOff, Activity, Users2, Bell, HardDrive } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const tenantId = session!.user.organizationId;
  const userId = session!.user.id;
  const role = session!.user.role as Role;
  const canInvite = hasPermission(role, "members:invite");

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  let dbError = false;
  let organizationName = "TeamFlow";
  let projectCount = 0;
  let taskCount = 0;
  let memberCount = 0;
  let completionRate = 0;
  let myTasks: Array<{
    id: string; title: string; dueDate: string | null;
    projectId: string; projectName: string; isOverdue: boolean;
  }> = [];
  let deadlineTasks: Array<{ id: string; title: string; dueDate: string; projectId: string }> = [];
  let recentProjects: Array<{
    id: string; name: string; status: string; dueDate: string | null;
    totalTasks: number; completedTasks: number; memberCount: number;
  }> = [];
  let openInvitations: Array<{ id: string; email: string; role: string }> = [];

  try {
    const [
      organization,
      pCount,
      tCount,
      doneTaskCount,
      mCount,
      myTasksRaw,
      deadlineTasksRaw,
      recentProjectsRaw,
      invitations,
    ] = await Promise.all([
      prisma.organization.findUnique({ where: { id: tenantId }, select: { name: true } }),
      prisma.project.count({ where: { tenantId } }),
      prisma.task.count({ where: { tenantId } }),
      prisma.task.count({ where: { tenantId, status: "DONE" } }),
      prisma.membership.count({ where: { tenantId } }),

      prisma.task.findMany({
        where: { tenantId, assigneeId: userId, status: { not: "DONE" } },
        orderBy: [{ dueDate: "asc" }],
        take: 8,
        include: { project: { select: { id: true, name: true } } },
      }),

      prisma.task.findMany({
        where: {
          tenantId,
          status: { not: "DONE" },
          dueDate: { gte: startOfToday, lt: endOfWeek },
        },
        orderBy: { dueDate: "asc" },
        take: 10,
        select: { id: true, title: true, dueDate: true, projectId: true },
      }),

      prisma.project.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { tasks: { select: { status: true, assigneeId: true } } },
      }),

      prisma.invitation.findMany({
        where: { tenantId, status: "PENDING", expiresAt: { gt: now } },
        select: { id: true, email: true, role: true },
      }),
    ]);

    organizationName = organization?.name ?? "TeamFlow";
    projectCount = pCount;
    taskCount = tCount;
    memberCount = mCount;
    completionRate = tCount === 0 ? 0 : Math.round((doneTaskCount / tCount) * 100);

    myTasks = myTasksRaw.map((task: (typeof myTasksRaw)[number]) => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      projectId: task.project.id,
      projectName: task.project.name,
      isOverdue: task.dueDate ? task.dueDate < now : false,
    }));

    deadlineTasks = deadlineTasksRaw
      .filter((t: (typeof deadlineTasksRaw)[number]) => t.dueDate)
      .map((t: (typeof deadlineTasksRaw)[number]) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate!.toISOString(),
        projectId: t.projectId,
      }));

    recentProjects = recentProjectsRaw.map((project: (typeof recentProjectsRaw)[number]) => {
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(
        (t: (typeof project.tasks)[number]) => t.status === "DONE"
      ).length;
      const memberIds = new Set(
        project.tasks.map((t: (typeof project.tasks)[number]) => t.assigneeId).filter(Boolean)
      );
      return {
        id: project.id,
        name: project.name,
        status: project.status,
        dueDate: project.dueDate ? project.dueDate.toISOString() : null,
        totalTasks,
        completedTasks,
        memberCount: memberIds.size,
      };
    });

    openInvitations = invitations;
  } catch (error) {
    console.error("[DASHBOARD_DB_ERROR]", error);
    dbError = true;
  }

  return (
    <div className="flex flex-col gap-6">
      <WelcomeBanner userName={session!.user.name ?? null} organizationName={organizationName} />

      {dbError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <WifiOff className="size-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">
            Could not reach the database — check your connection and{" "}
            <a href="/dashboard" className="underline">
              refresh
            </a>
            .
          </p>
        </div>
      )}

      <QuickActions canInvite={canInvite} />

      <OrgStatisticsWidget
        projectCount={projectCount}
        taskCount={taskCount}
        memberCount={memberCount}
        completionRate={completionRate}
      />

      <OpenInvitationsWidget invitations={openInvitations} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MyTasksWidget tasks={myTasks} />
        <UpcomingDeadlinesWidget tasks={deadlineTasks} />
      </div>

      {!dbError && recentProjects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban className="size-4" />
              No projects yet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Once you create your first project, it&apos;ll show up here with a live Kanban board.
            </p>
          </CardContent>
        </Card>
      ) : (
        <RecentProjectsWidget projects={recentProjects} />
      )}

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Coming soon
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ComingSoonWidget
            title="Recent activity"
            description="A feed of what's happening — projects created, tasks completed, comments, new members."
            icon={Activity}
          />
          <ComingSoonWidget
            title="Team activity"
            description="See who's online and recently active across your organization."
            icon={Users2}
          />
          <ComingSoonWidget
            title="Notifications"
            description="A central place for unread mentions, assignments, and updates."
            icon={Bell}
          />
          <ComingSoonWidget
            title="Storage used"
            description="Track file storage once uploads are wired up."
            icon={HardDrive}
          />
        </div>
      </div>
    </div>
  );
}