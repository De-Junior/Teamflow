// PASTE LOCATION: src/components/dashboard/widgets/recent-projects.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type RecentProject = {
  id: string;
  name: string;
  status: string;
  dueDate: string | null;
  totalTasks: number;
  completedTasks: number;
  memberCount: number;
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-[var(--status-in-progress)]/10 text-[var(--status-in-progress)]",
  ON_HOLD: "bg-[var(--status-review)]/10 text-[var(--status-review)]",
  COMPLETED: "bg-[var(--status-done)]/10 text-[var(--status-done)]",
  ARCHIVED: "bg-[var(--status-backlog)]/10 text-[var(--status-backlog)]",
};

export function RecentProjectsWidget({ projects }: { projects: RecentProject[] }) {
  return (
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
      <CardContent className="flex flex-col gap-3 pt-0">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create your first project to see it here.
          </p>
        ) : (
          projects.map((project) => {
            const progress =
              project.totalTasks === 0
                ? 0
                : Math.round((project.completedTasks / project.totalTasks) * 100);

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex flex-col gap-2 rounded-md border border-border p-3 transition-colors hover:bg-muted"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                      STATUS_STYLES[project.status]
                    )}
                  >
                    {project.status.toLowerCase().replace("_", " ")}
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {project.completedTasks}/{project.totalTasks} tasks · {project.memberCount}{" "}
                    {project.memberCount === 1 ? "member" : "members"}
                  </span>
                  {project.dueDate && (
                    <span>
                      Due{" "}
                      {new Date(project.dueDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}