// PASTE LOCATION: src/app/(dashboard)/projects/page.tsx (overwrite entire file)
import { auth } from "@/lib/auth";
import { projectRepository } from "@/lib/db/tenant";
import { hasPermission } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";
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
    const raw = await projectRepository(ctx).findMany({
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
    });
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSerialized(raw: any[]) {
  return raw.map((p) => ({
    id:          p.id          as string,
    name:        p.name        as string,
    description: (p.description ?? null) as string | null,
    status:      p.status      as string,
    priority:    p.priority    as string,
    dueDate:     p.dueDate     ? (p.dueDate as Date).toISOString() : null,
    createdAt:   (p.createdAt  as Date).toISOString(),
    updatedAt:   (p.updatedAt  as Date).toISOString(),
    taskCount:   p._count.tasks as number,
    doneCount:   (p.tasks as { status: string }[]).filter((t) => t.status === "DONE").length,
    members: Array.from(
      new Map(
        (p.tasks as { assignee: { id: string; name: string | null; image: string | null } | null }[])
          .map((t) => t.assignee)
          .filter((a): a is NonNullable<typeof a> => a !== null)
          .map((a) => [a.id, a])
      ).values()
    ).slice(0, 4) as { id: string; name: string | null; image: string | null }[],
  }));
}