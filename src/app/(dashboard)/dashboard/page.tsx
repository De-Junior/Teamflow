import Link from "next/link";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { FolderKanban } from "lucide-react";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getDashboard } from "@/services/dashboard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/state";
import { ActivityFeed } from "@/components/dashboard/widgets/activity-feed";
import { DashboardHeader } from "@/components/dashboard/widgets/dashboard-header";
import { KpiStrip } from "@/components/dashboard/widgets/kpi-strip";
import { MyTasksWidget } from "@/components/dashboard/widgets/my-tasks";
import { OpenInvitationsWidget } from "@/components/dashboard/widgets/open-invitations";
import { RecentProjectsWidget } from "@/components/dashboard/widgets/recent-projects";
import { UpcomingDeadlinesWidget } from "@/components/dashboard/widgets/upcoming-deadlines";

export const metadata = { title: "Dashboard · TeamFlow" };

export default async function DashboardPage() {
  const session = await auth();
  // The proxy already guards this route; this keeps the tenant-scoped queries below honest.
  if (!session?.user?.organizationId) redirect("/login");

  const role = session.user.role as Role;
  const canInvite = hasPermission(role, "members:invite");
  const canCreateProject = hasPermission(role, "project:create");

  // A database failure here is caught by the route's error boundary (error.tsx).
  const data = await getDashboard({
    tenantId: session.user.tenantId,
    organizationId: session.user.organizationId,
    userId: session.user.id,
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <DashboardHeader
        userName={session.user.name ?? null}
        organizationName={data.organizationName}
        plan={data.plan}
        canCreateProject={canCreateProject}
        canInvite={canInvite}
      />

      <KpiStrip kpis={data.kpis} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <MyTasksWidget tasks={data.myTasks} />
          <UpcomingDeadlinesWidget tasks={data.deadlines} />
        </div>
        <div className="flex flex-col gap-4">
          <ActivityFeed items={data.activity} />
          {canInvite && <OpenInvitationsWidget invitations={data.invitations} />}
        </div>
      </div>

      {data.recentProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Projects hold your team's tasks on a Kanban board, a list and a calendar."
          action={
            canCreateProject ? (
              <Button asChild size="sm">
                <Link href="/projects?create=1">Create your first project</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <RecentProjectsWidget projects={data.recentProjects} />
      )}
    </div>
  );
}
