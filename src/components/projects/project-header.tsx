// PASTE LOCATION: src/components/projects/project-header.tsx (create new file)
"use client";

import { cn }        from "@/lib/utils";
import { Calendar }  from "lucide-react";
import type { ProjectViewData, Member } from "@/components/projects/project-view";

const STATUS_STYLES: Record<string,string> = {
  ACTIVE:"bg-[var(--status-in-progress)]/10 text-[var(--status-in-progress)]",
  ON_HOLD:"bg-[var(--status-review)]/10 text-[var(--status-review)]",
  COMPLETED:"bg-[var(--status-done)]/10 text-[var(--status-done)]",
  ARCHIVED:"bg-[var(--status-backlog)]/10 text-[var(--status-backlog)]",
};
const STATUS_LABEL: Record<string,string> = {
  ACTIVE:"Active", ON_HOLD:"On hold", COMPLETED:"Completed", ARCHIVED:"Archived",
};
const PRIORITY_DOT: Record<string,string> = {
  LOW:"bg-[var(--priority-low)]", MEDIUM:"bg-[var(--priority-medium)]",
  HIGH:"bg-[var(--priority-high)]", URGENT:"bg-[var(--priority-urgent)]",
};

export function ProjectHeader({ project, taskCount, doneCount, overdueCount, members }: {
  project:      ProjectViewData;
  taskCount:    number;
  doneCount:    number;
  overdueCount: number;
  members:      Member[];
}) {
  const progress  = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;
  const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && project.status !== "COMPLETED";

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("size-2 rounded-full", PRIORITY_DOT[project.priority])} />
            <h1 className="text-xl font-semibold text-foreground">{project.name}</h1>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[project.status])}>
              {STATUS_LABEL[project.status] ?? project.status}
            </span>
          </div>
          {project.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{project.description}</p>
          )}

          {/* Progress */}
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 w-48 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{progress}% · {doneCount}/{taskCount} tasks</span>
            {overdueCount > 0 && (
              <span className="text-xs font-medium text-destructive">{overdueCount} overdue</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Member avatars */}
          {members.length > 0 && (
            <div className="flex -space-x-2">
              {members.slice(0, 6).map((m) => {
                const initials = (m.name ?? "?").split(" ").map(p=>p[0]).slice(0,2).join("").toUpperCase();
                return (
                  <div key={m.id} title={m.name ?? undefined}
                    className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-accent text-[10px] font-medium text-accent-foreground"
                  >
                    {initials}
                  </div>
                );
              })}
              {members.length > 6 && (
                <div className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] text-muted-foreground">
                  +{members.length - 6}
                </div>
              )}
            </div>
          )}

          {/* Due date */}
          {project.dueDate && (
            <span className={cn("flex items-center gap-1 text-xs", isOverdue ? "text-destructive" : "text-muted-foreground")}>
              <Calendar className="size-3" />
              Due {new Date(project.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}