// PASTE LOCATION: src/app/(dashboard)/dashboard/team/[userId]/page.tsx (create new file + folder)
import { notFound }    from "next/navigation";
import Link            from "next/link";
import { auth }        from "@/lib/auth";
import { prisma }      from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn }          from "@/lib/utils";
import { ArrowLeft, Mail, Calendar } from "lucide-react";

const ROLE_LABEL: Record<string,string> = {
  SUPER_ADMIN:"Super Admin", OWNER:"Owner",
  MANAGER:"Manager", DEVELOPER:"Developer", VIEWER:"Viewer",
};
const STATUS_COLOR: Record<string,string> = {
  BACKLOG:"bg-slate-400/15 text-slate-500", TODO:"bg-blue-400/15 text-blue-500",
  IN_PROGRESS:"bg-yellow-400/15 text-yellow-600", REVIEW:"bg-purple-400/15 text-purple-600",
  DONE:"bg-green-400/15 text-green-600",
};
const STATUS_LABEL: Record<string,string> = {
  BACKLOG:"Backlog", TODO:"To do", IN_PROGRESS:"In progress", REVIEW:"Review", DONE:"Done",
};
const PRIORITY_DOT: Record<string,string> = {
  LOW:"bg-[var(--priority-low)]", MEDIUM:"bg-[var(--priority-medium)]",
  HIGH:"bg-[var(--priority-high)]", URGENT:"bg-[var(--priority-urgent)]",
};
const ACTION_LABEL: Record<string,string> = {
  CREATED:"created", UPDATED:"updated", DELETED:"deleted",
  ARCHIVED:"archived", INVITED:"invited", ROLE_CHANGED:"changed role in",
  LOGIN:"logged in", LOGOUT:"logged out",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit",
  });
}

export default async function MemberProfilePage({
  params,
}: { params: Promise<{ userId: string }> }) {
  const { userId }  = await params;
  const session     = await auth();
  const tenantId    = session!.user.tenantId;
  const orgId       = session!.user.organizationId;

  const [membership, assignedTasks, activity] = await Promise.all([
    prisma.membership.findFirst({
      where:   { userId, organizationId: orgId },
      include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    }),
    prisma.task.findMany({
      where:   { tenantId, assigneeId: userId },
      orderBy: { updatedAt: "desc" },
      take:    10,
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.auditLog.findMany({
      where:   { tenantId, userId },
      orderBy: { createdAt: "desc" },
      take:    10,
    }),
  ]);

  if (!membership) notFound();

  const user    = membership.user;
  const isSelf  = userId === session!.user.id;
  const initials = (user.name ?? user.email).split(" ").map(p=>p[0]).slice(0,2).join("").toUpperCase();

  // Unique projects from tasks
  const projectMap = new Map<string, string>();
  assignedTasks.forEach(t => projectMap.set(t.project.id, t.project.name));
  const projects = Array.from(projectMap.entries());

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/dashboard/team"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to team
      </Link>

      {/* Profile header */}
      <Card>
        <CardContent className="flex items-center gap-5 p-6">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-semibold text-accent-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">{user.name ?? "No name"}</h1>
              {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {ROLE_LABEL[membership.role as string] ?? membership.role}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5" /> {user.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                Joined {new Date(membership.joinedAt).toLocaleDateString(undefined, {
                  year:"numeric", month:"long", day:"numeric",
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Assigned tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Assigned tasks
              <span className="ml-2 text-sm font-normal text-muted-foreground">({assignedTasks.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {assignedTasks.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">No tasks assigned.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {assignedTasks.map((task) => (
                  <Link key={task.id} href={`/projects/${task.project.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
                    <div className="flex min-w-0 items-start gap-2">
                      <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", PRIORITY_DOT[task.priority as string])} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.project.name}</p>
                      </div>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLOR[task.status as string])}>
                      {STATUS_LABEL[task.status as string] ?? task.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active projects */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Active projects
              <span className="ml-2 text-sm font-normal text-muted-foreground">({projects.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {projects.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {projects.map(([id, name]) => (
                  <Link key={id} href={`/projects/${id}`}
                    className="flex items-center gap-2 py-2.5 text-sm font-medium text-foreground hover:opacity-80">
                    {name}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {activity.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {activity.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm text-foreground">
                      {ACTION_LABEL[log.action] ?? log.action.toLowerCase()}{" "}
                      <span className="text-muted-foreground">{log.entityType.toLowerCase()}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{fmt(log.createdAt.toISOString())}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}