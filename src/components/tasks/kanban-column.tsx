"use client";

import { useDroppable }                         from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn }                                   from "@/lib/utils";
import { TaskCard, type TaskCardData }           from "@/components/tasks/task-card";
import { CreateTaskDialog }                     from "@/components/tasks/create-task-dialog";
import { hasPermission }                        from "@/lib/auth/permissions";
import type { Role }                            from "@prisma/client";

const COLUMN_DOT: Record<string,string> = {
  BACKLOG:"bg-[var(--status-backlog)]", TODO:"bg-[var(--status-todo)]",
  IN_PROGRESS:"bg-[var(--status-in-progress)]", REVIEW:"bg-[var(--status-review)]",
  DONE:"bg-[var(--status-done)]",
};

export function KanbanColumn({ status, label, tasks, projectId, userRole, canDrag, onTaskCreated, onTaskDeleted, onTaskMarkedDone, onTaskClick }: {
  status:           string; label: string;
  tasks:            TaskCardData[];
  projectId:        string; userRole: string;
  canDrag:          boolean;
  onTaskCreated:    () => void;
  onTaskDeleted:    (id: string) => void;
  onTaskMarkedDone: (id: string) => void;
  onTaskClick?:     (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: "column", status } });
  const canCreate = hasPermission(userRole as Role, "task:create");

  return (
    <section aria-label={`${label}, ${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`} className="flex w-72 shrink-0 snap-start flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <span aria-hidden className={cn("size-2 rounded-full", COLUMN_DOT[status])} />
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        <span aria-hidden className="text-xs tabular-nums text-muted-foreground">{tasks.length}</span>
      </div>

      <SortableContext items={tasks.map(t=>t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef}
          className={cn(
            "flex min-h-24 flex-1 flex-col gap-2 rounded-lg border border-dashed border-transparent p-1 transition-colors",
            isOver && "border-primary/40 bg-accent/40"
          )}
        >
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} userRole={userRole} canDrag={canDrag}
              onTaskDeleted={onTaskDeleted}
              onTaskMarkedDone={onTaskMarkedDone}
              onTaskClick={onTaskClick}
            />
          ))}
          {tasks.length === 0 && (
            <p className="flex min-h-20 items-center justify-center rounded-md text-xs text-muted-foreground/70">
              {canDrag ? "Drop tasks here" : "No tasks"}
            </p>
          )}
        </div>
      </SortableContext>

      {canCreate && (
        <CreateTaskDialog projectId={projectId} defaultStatus={status} onCreated={onTaskCreated} />
      )}
    </section>
  );
}