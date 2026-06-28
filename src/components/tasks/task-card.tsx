// PASTE LOCATION: src/components/tasks/task-card.tsx (overwrite entire file)
"use client";

import { useSortable }       from "@dnd-kit/sortable";
import { CSS }               from "@dnd-kit/utilities";
import { cn }                from "@/lib/utils";
import { Calendar, GripVertical, CheckCircle2, Trash2, MessageSquare, CheckSquare } from "lucide-react";

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-[var(--priority-low)]", MEDIUM: "bg-[var(--priority-medium)]",
  HIGH: "bg-[var(--priority-high)]", URGENT: "bg-[var(--priority-urgent)]",
};

const CAN_DELETE    = ["SUPER_ADMIN", "OWNER", "MANAGER"];
const CAN_MARK_DONE = ["SUPER_ADMIN", "OWNER", "MANAGER", "DEVELOPER"];

export type TaskCardData = {
  id:          string;
  title:       string;
  description?: string | null;
  priority:    string;
  status:      string;
  dueDate:     string | null;
  assignee:    { id: string; name: string | null; image: string | null } | null;
  labels:      Array<{ id: string; name: string; color: string }>;
  _count:      { comments: number; subtasks: number; checklistItems: number };
};

export function TaskCard({
  task, isOverlay = false, userRole,
  onTaskDeleted, onTaskMarkedDone, onTaskClick,
}: {
  task:              TaskCardData;
  isOverlay?:        boolean;
  userRole?:         string;
  onTaskDeleted?:    (id: string) => void;
  onTaskMarkedDone?: (id: string) => void;
  onTaskClick?:      (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id, data: { type: "task" },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const initials = task.assignee?.name
    ?.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const canDelete   = userRole ? CAN_DELETE.includes(userRole)    : false;
  const canMarkDone = userRole ? CAN_MARK_DONE.includes(userRole) : false;
  const isDone      = task.status === "DONE";

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isDone;

  async function deleteTask(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this task?")) return;
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) onTaskDeleted?.(task.id);
  }

  async function markDone(e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    });
    if (res.ok) onTaskMarkedDone?.(task.id);
  }

  const checklistTotal   = task._count.checklistItems;
  // We don't have checked count on the card — show total only
  const hasChecklist     = checklistTotal > 0;
  const hasComments      = task._count.comments > 0;

  return (
    <div
      ref={setNodeRef} style={style} {...attributes}
      className={cn(
        "group relative rounded-md border border-border bg-card shadow-sm",
        isDragging && !isOverlay && "opacity-40",
        isOverlay && "rotate-1 shadow-lg"
      )}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 cursor-grab p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </div>

      {/* Hover actions */}
      {!isOverlay && (
        <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {canMarkDone && !isDone && (
            <button onClick={markDone} title="Mark done"
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              <CheckCircle2 className="size-3.5" />
            </button>
          )}
          {canDelete && (
            <button onClick={deleteTask} title="Delete"
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Clickable body */}
      <div
        className="cursor-pointer p-3 pl-7 pr-10"
        onClick={() => !isOverlay && onTaskClick?.(task.id)}
      >
        {/* Priority + title */}
        <div className="mb-2 flex items-start gap-2">
          <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", PRIORITY_DOT[task.priority])} />
          <p className="line-clamp-2 text-sm font-medium text-foreground">{task.title}</p>
        </div>

        {/* Labels */}
        {task.labels.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {task.labels.slice(0, 3).map((l) => (
              <span
                key={l.id}
                style={{ backgroundColor: l.color + "22", color: l.color, borderColor: l.color + "44" }}
                className="rounded-full border px-1.5 py-0 text-[10px] font-medium"
              >
                {l.name}
              </span>
            ))}
            {task.labels.length > 3 && (
              <span className="rounded-full bg-muted px-1.5 py-0 text-[10px] text-muted-foreground">
                +{task.labels.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {task.dueDate && (
              <span className={cn("flex items-center gap-1 text-xs", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                <Calendar className="size-3" />
                {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            )}
            {hasComments && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="size-3" />{task._count.comments}
              </span>
            )}
            {hasChecklist && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckSquare className="size-3" />{task._count.checklistItems}
              </span>
            )}
          </div>
          {task.assignee && (
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground">
              {initials}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}