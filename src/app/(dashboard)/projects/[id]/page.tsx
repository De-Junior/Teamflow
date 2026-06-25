// PASTE LOCATION: src/app/(dashboard)/projects/[id]/page.tsx (overwrite entire file)
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { projectRepository } from "@/lib/db/tenant";
import { hasPermission } from "@/lib/auth/permissions";
import { KanbanBoardLoader } from "@/components/tasks/kanban-board-loader";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { KanbanDoneButton } from "@/components/tasks/kanban-done-button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import type { Role } from "@prisma/client";

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-[var(--priority-low)]/10 text-[var(--priority-low)]",
  MEDIUM: "bg-[var(--priority-medium)]/10 text-[var(--priority-medium)]",
  HIGH: "bg-[var(--priority-high)]/10 text-[var(--priority-high)]",
  URGENT: "bg-[var(--priority-urgent)]/10 text-[var(--priority-urgent)]",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const ctx = {
    tenantId: session!.user.tenantId,
    organizationId: session!.user.organizationId,
    userId: session!.user.id,
  };

  const project = await projectRepository(ctx).findById(id, {
    include: {
      tasks: {
        orderBy: { position: "asc" },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const tasks = project.tasks.map((task: (typeof project.tasks)[number]) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    assignee: task.assignee,
  }));

  const canDeleteProject = hasPermission(session!.user.role as Role, "project:delete");

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Link
            href="/projects"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to projects
          </Link>
          <div className="flex items-center gap-2">
            {canDeleteProject && (
              <DeleteProjectButton projectId={project.id} projectName={project.name} />
            )}
            <KanbanDoneButton />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground">{project.name}</h1>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
              PRIORITY_STYLES[project.priority]
            )}
          >
            {project.priority.toLowerCase()}
          </span>
        </div>
        {project.description && (
          <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
        )}
      </div>

      <KanbanBoardLoader
        projectId={project.id}
        initialTasks={tasks}
        userRole={session!.user.role}
      />
    </div>
  );
}