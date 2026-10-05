import { auth } from "@/lib/auth";
import { projectRepository } from "@/lib/db/tenant";
import { hasPermission } from "@/lib/auth/permissions";
import { Prisma, Role } from "@prisma/client";
import { ProjectsClient } from "@/components/projects/projects-client";

export default async function ProjectsPage() {
  const session = await auth();
  const ctx = {
    tenantId:       session!.user.tenantId,
    organizationId: session!.user.organizationId,
    userId:         session!.user.id,
  };

  const userRole   = session!.user.role as Role;
  const canCreate  = hasPermission(userRole, "project:create");
  const canDelete  = hasPermission(userRole, "project:delete");
  const canUpdate  = hasPermission(userRole, "project:update");
  const canArchive = hasPermission(userRole, "project:archive");

  let projects: ReturnType<typeof buildSerialized> = [];

  try {
    const raw = await projectRepository(ctx).findMany(projectListArgs);
    projects = buildSerialized(raw);
  } catch { /* DB unavailable — render empty state */ }

  return (
    <ProjectsClient
      projects={projects}
      canCreate={canCreate}
      canDelete={canDelete}
      canUpdate={canUpdate}
      canArchive={canArchive}
    />
  );
}

const projectListArgs = {
  orderBy: { createdAt: "desc" },
  include: {
    _count: { select: { tasks: true } },
    tasks: {
      select: {
        status:   true,
        assignee: { select: { id: true, name: true, image: true } },
      },
    },
  },
} satisfies Omit<Prisma.ProjectFindManyArgs, "where">;

type ProjectListRow = Prisma.ProjectGetPayload<typeof projectListArgs>;

function buildSerialized(raw: ProjectListRow[]) {
  return raw.map((p) => ({
    id:          p.id,
    name:        p.name,
    description: p.description ?? null,
    status:      p.status as string,
    priority:    p.priority as string,
    dueDate:     p.dueDate ? p.dueDate.toISOString() : null,
    createdAt:   p.createdAt.toISOString(),
    updatedAt:   p.updatedAt.toISOString(),
    taskCount:   p._count.tasks,
    doneCount:   p.tasks.filter((t) => t.status === "DONE").length,
    // Up to four distinct assignees, shown as an avatar stack on the card
    members: Array.from(
      new Map(
        p.tasks
          .map((t) => t.assignee)
          .filter((a): a is NonNullable<typeof a> => a !== null)
          .map((a) => [a.id, a])
      ).values()
    ).slice(0, 4),
  }));
}