import { notFound }          from "next/navigation";
import { auth }              from "@/lib/auth";
import { projectRepository } from "@/lib/db/tenant";
import { prisma }            from "@/lib/db/prisma";
import { hasPermission }     from "@/lib/auth/permissions";
import { ProjectView }       from "@/components/projects/project-view";
import Link                  from "next/link";
import { ArrowLeft }         from "lucide-react";
import type { Role }         from "@prisma/client";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = {
    tenantId:       session!.user.tenantId,
    organizationId: session!.user.organizationId,
    userId:         session!.user.id,
  };

  const [project, projectMembers, orgMembers] = await Promise.all([
    projectRepository(ctx).findById(id, {
      include: {
        tasks: {
          orderBy: { position: "asc" },
          include: {
            assignee: { select: { id: true, name: true, image: true } },
            labels:   true,
            _count:   { select: { comments: true, subtasks: true, checklistItems: true } },
          },
        },
      },
    }),
    prisma.projectMember.findMany({
      where:   { projectId: id, tenantId: ctx.tenantId },
      include: { user: { select: { id: true, name: true, image: true } } },
    }),
    prisma.membership.findMany({
      where:   { tenantId: ctx.tenantId },
      include: { user: { select: { id: true, name: true, image: true } } },
    }),
  ]);

  if (!project) notFound();

  const canManageMembers = hasPermission(session!.user.role as Role, "project:manage_members");

  const tasks = project.tasks.map((t: (typeof project.tasks)[number]) => ({
    id:          t.id,
    title:       t.title,
    description: t.description ?? null,
    priority:    t.priority   as string,
    status:      t.status     as string,
    dueDate:     t.dueDate    ? t.dueDate.toISOString() : null,
    assignee:    t.assignee,
    labels:      t.labels.map((l: { id: string; name: string; color: string }) => ({ id: l.id, name: l.name, color: l.color })),
    _count:      t._count,
  }));

  const members = projectMembers.map((m: (typeof projectMembers)[number]) => ({
    id:    m.user.id,
    name:  m.user.name,
    image: m.user.image,
  }));

  const allOrgMembers = orgMembers.map((m: (typeof orgMembers)[number]) => ({
    id:    m.user.id,
    name:  m.user.name,
    image: m.user.image,
  }));

  return (
    <div className="flex h-full flex-col gap-4">
      <Link href="/projects"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to projects
      </Link>

      <ProjectView
        project={{
          id:          project.id,
          name:        project.name,
          description: project.description ?? null,
          status:      project.status as string,
          priority:    project.priority as string,
          dueDate:     (project as { dueDate?: Date | null }).dueDate?.toISOString() ?? null,
          updatedAt:   (project as { updatedAt: Date }).updatedAt.toISOString(),
        }}
        initialTasks={tasks}
        members={members}
        allOrgMembers={allOrgMembers}
        canManageMembers={canManageMembers}
        userRole={session!.user.role}
        currentUserId={session!.user.id}
      />
    </div>
  );
}