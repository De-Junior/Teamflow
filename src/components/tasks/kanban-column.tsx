// PASTE LOCATION: src/components/tasks/kanban-column.tsx (overwrite entire file)
"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { TaskCard, type TaskCardData } from "@/components/tasks/task-card";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";

const COLUMN_DOT: Record<string, string> = {
  BACKLOG: "bg-[var(--status-backlog)]",
  TODO: "bg-[var(--status-todo)]",
  IN_PROGRESS: "bg-[var(--status-in-progress)]",
  REVIEW: "bg-[var(--status-review)]",
  DONE: "bg-[var(--status-done)]",
};

export function KanbanColumn({
  status, label, tasks, projectId,
  onTaskCreated, userRole, onTaskDeleted, onTaskMarkedDone,
}: {
  status: string;
  label: string;
  tasks: TaskCardData[];
  projectId: string;
  onTaskCreated: () => void;
  userRole?: string;
  onTaskDeleted?: (id: string) => void;
  onTaskMarkedDone?: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: "column", status } });

  return (
    <div className="flex h-[calc(100vh-220px)] w-72 shrink-0 flex-col gap-3">
      <div className="flex shrink-0 items-center gap-2 px-1">
        <span className={cn("size-2 rounded-full", COLUMN_DOT[status])} />
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-dashed border-transparent p-1 transition-colors",
            isOver && "border-primary/40 bg-accent/40"
          )}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              userRole={userRole}
              onTaskDeleted={onTaskDeleted}
              onTaskMarkedDone={onTaskMarkedDone}
            />
          ))}
        </div>
      </SortableContext>

      <div className="shrink-0">
        <CreateTaskDialog projectId={projectId} defaultStatus={status} onCreated={onTaskCreated} />
      </div>
    </div>
  );
}