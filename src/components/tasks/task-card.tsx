"use client";

import { useSortable }       from "@dnd-kit/sortable";
import { CSS }               from "@dnd-kit/utilities";
import { cn }                from "@/lib/utils";
import { Calendar, GripVertical, CheckCircle2, Trash2, MessageSquare, CheckSquare } from "lucide-react";
import { useTaskActions }    from "@/components/tasks/use-task-actions";

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-[var(--priority-low)]", MEDIUM: "bg-[var(--priority-medium)]",
  HIGH: "bg-[var(--priority-high)]", URGENT: "bg-[var(--priority-urgent)]",
};

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

/** Visible on hover or keyboard focus, and always on touch screens (which have no hover). */
const REVEAL = "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100";

export function TaskCard({
  task, isOverlay = false, userRole, canDrag = false,
  onTaskDeleted, onTaskMarkedDone, onTaskClick,
}: {
  task:              TaskCardData;
  isOverlay?:        boolean;
  userRole?:         string;
  canDrag?:          boolean;
  onTaskDeleted?:    (id: string) => void;
  onTaskMarkedDone?: (id: string) => void;
  onTaskClick?:      (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id, data: { type: "task" }, disabled: !canDrag,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const { can, markDone, remove } = useTaskActions(userRole, { onDeleted: onTaskDeleted, onDone: onTaskMarkedDone });

  const initials = task.assignee?.name
    ?.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const isDone    = task.status === "DONE";
  const isOverdue = Boolean(task.dueDate && new Date(task.dueDate) < new Date() && !isDone);
  const dueLabel  = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-GB", { timeZone: "UTC", month: "short", day: "numeric" })
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-md border border-border bg-card shadow-sm transition-shadow hover:shadow-md",
        isDragging && !isOverlay && "opacity-40",
        isOverlay && "rotate-1 shadow-lg"
      )}
    >
      {canDrag && (
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Move "${task.title}". Press space to pick up, arrow keys to move, space to drop.`}
          className={cn(
            "absolute left-1 top-1/2 -translate-y-1/2 cursor-grab touch-none rounded p-1 text-muted-foreground active:cursor-grabbing",
            REVEAL
          )}
        >
          <GripVertical className="size-3.5" />
        </button>
      )}

      {!isOverlay && (can.complete || can.delete) && (
        <div className={cn("absolute right-1.5 top-1.5 flex items-center gap-0.5", REVEAL)}>
          {can.complete && !isDone && (
            <button
              onClick={() => void markDone(task)}
              aria-label={`Mark "${task.title}" done`}
              title="Mark done"
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <CheckCircle2 className="size-3.5" />
            </button>
          )}
          {can.delete && (
            <button
              onClick={() => void remove(task)}
              aria-label={`Delete "${task.title}"`}
              title="Delete"
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        className="block w-full rounded-md p-3 pl-7 pr-12 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => !isOverlay && onTaskClick?.(task.id)}
      >
        <span className="mb-2 flex items-start gap-2">
          <span
            className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", PRIORITY_DOT[task.priority])}
            aria-label={`${task.priority.toLowerCase()} priority`}
          />
          <span className="line-clamp-2 text-sm font-medium text-foreground">{task.title}</span>
        </span>

        {task.labels.length > 0 && (
          <span className="mb-2 flex flex-wrap gap-1">
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
          </span>
        )}

        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            {dueLabel && (
              <span className={cn("flex items-center gap-1 text-xs", isOverdue ? "font-medium text-destructive" : "text-muted-foreground")}>
                <Calendar aria-hidden className="size-3" />
                <span className="sr-only">{isOverdue ? "Overdue, was due" : "Due"}</span>
                {dueLabel}
              </span>
            )}
            {task._count.comments > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare aria-hidden className="size-3" />{task._count.comments}
                <span className="sr-only">comments</span>
              </span>
            )}
            {task._count.checklistItems > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckSquare aria-hidden className="size-3" />{task._count.checklistItems}
                <span className="sr-only">checklist items</span>
              </span>
            )}
          </span>
          {task.assignee && (
            <span
              title={task.assignee.name ?? undefined}
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground"
            >
              <span aria-hidden>{initials}</span>
              <span className="sr-only">Assigned to {task.assignee.name}</span>
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
