// PASTE LOCATION: src/app/(dashboard)/dashboard/page.tsx (overwrite entire file)
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, CheckCircle2, Users, Clock, ArrowRight, WifiOff } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const tenantId = session!.user.organizationId;

  type RecentProject = { id: string; name: string; _count: { tasks: number } };

  let projectCount = 0;
  let taskCount = 0;
  let memberCount = 0;
  let recentProjects: RecentProject[] = [];
  let dbError = false;

  try {
    const results = await Promise.all([
      prisma.project.count({ where: { tenantId } }),
      prisma.task.count({ where: { tenantId, status: { not: "DONE" } } }),
      prisma.membership.count({ where: { tenantId } }),
      prisma.project.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { _count: { select: { tasks: true } } },
      }),
    ]);
    projectCount = results[0];
    taskCount = results[1];
    memberCount = results[2];
    recentProjects = results[3];
  } catch (error) {
    console.error("[DASHBOARD_DB_ERROR]", error);
    dbError = true;
  }

  const stats = [
    { label: "Active projects", value: projectCount, icon: FolderKanban, href: "/projects" },
    { label: "Open tasks", value: taskCount, icon: Clock, href: null },
    { label: "Team members", value: memberCount, icon: Users, href: null },
    { label: "Completed this week", value: 0, icon: CheckCircle2, href: null },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Welcome back, {session!.user.name?.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening across your organization.
        </p>
      </div>

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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => {
          const card = (
            <Card className={href ? "transition-shadow hover:shadow-md" : undefined}>
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
          );
          return href ? (
            <Link key={label} href={href}>{card}</Link>
          ) : (
            <div key={label}>{card}</div>
          );
        })}
      </div>

      {!dbError && recentProjects.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No projects yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Once you create your first project it&apos;ll show up here with a live Kanban board.
            </p>
          </CardContent>
        </Card>
      )}

      {!dbError && recentProjects.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent projects</CardTitle>
            <Link
              href="/projects"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View all
              <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:bg-muted"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {project._count.tasks} {project._count.tasks === 1 ? "task" : "tasks"}
                  </p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}