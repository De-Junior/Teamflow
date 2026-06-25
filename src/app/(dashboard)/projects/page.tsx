// PASTE LOCATION: src/app/(dashboard)/projects/page.tsx
import { auth } from "@/lib/auth";
import { projectRepository } from "@/lib/db/tenant";
import { ProjectCard } from "@/components/projects/project-card";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { FolderKanban } from "lucide-react";

export default async function ProjectsPage() {
  const session = await auth();
  const ctx = {
    tenantId: session!.user.tenantId,
    organizationId: session!.user.organizationId,
    userId: session!.user.id,
  };

  const projects = await projectRepository(ctx).findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tasks: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length === 0
              ? "Create your first project to get started."
              : `${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
            <FolderKanban className="size-6 text-accent-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No projects yet</p>
            <p className="text-sm text-muted-foreground">
              Get your team organized by creating a project.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: (typeof projects)[number]) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              description={project.description}
              status={project.status}
              priority={project.priority}
              taskCount={project._count.tasks}
            />
          ))}
        </div>
      )}
    </div>
  );
}