// PASTE LOCATION: src/components/tasks/task-card.tsx (overwrite entire file)
"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Calendar, GripVertical, CheckCircle2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const PRIORITY_DOT: Record<string, string> = {
  LOW:    "bg-[var(--priority-low)]",
  MEDIUM: "bg-[var(--priority-medium)]",
  HIGH:   "bg-[var(--priority-high)]",
  URGENT: "bg-[var(--priority-urgent)]",
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent",
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
};

export function TaskCard({
  task,
  isOverlay = false,
  userRole,
  onTaskDeleted,
  onTaskMarkedDone,
}: {
  task:              TaskCardData;
  isOverlay?:        boolean;
  userRole?:         string;
  onTaskDeleted?:    (id: string) => void;
  onTaskMarkedDone?: (id: string) => void;
}) {
  const [detailOpen,    setDetailOpen]    = useState(false);
  const [isDeleting,    setIsDeleting]    = useState(false);
  const [isMarkingDone, setIsMarkingDone] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id:   task.id,
    data: { type: "task" },
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const initials = task.assignee?.name
    ?.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const canDelete    = userRole ? CAN_DELETE.includes(userRole)    : false;
  const canMarkDone  = userRole ? CAN_MARK_DONE.includes(userRole) : false;
  const isDone       = task.status === "DONE";

  async function deleteTask() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.ok) onTaskDeleted?.(task.id);
    } catch { /* silent */ }
    finally { setIsDeleting(false); }
  }

  async function markAsDone() {
    if (isDone) return;
    setIsMarkingDone(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: "DONE" }),
      });
      if (res.ok) onTaskMarkedDone?.(task.id);
    } catch { /* silent */ }
    finally { setIsMarkingDone(false); }
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={cn(
          "group relative rounded-md border border-border bg-card shadow-sm",
          isDragging && !isOverlay && "opacity-40",
          isOverlay && "rotate-1 shadow-lg"
        )}
      >
        {/* Drag handle — only element that listens to drag events */}
        <div
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-1.5 top-1/2 -translate-y-1/2 cursor-grab p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" />
        </div>

        {/* Hover action buttons */}
        {!isOverlay && (
          <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {canMarkDone && !isDone && (
              <button
                onClick={(e) => { e.stopPropagation(); void markAsDone(); }}
                disabled={isMarkingDone}
                title="Mark as done"
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <CheckCircle2 className="size-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!confirm("Delete this task? This cannot be undone.")) return;
                  void deleteTask();
                }}
                disabled={isDeleting}
                title="Delete task"
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Clickable body — opens detail dialog */}
        <div
          className="cursor-pointer p-3 pl-7 pr-14"
          onClick={() => !isOverlay && setDetailOpen(true)}
        >
          <div className="mb-2 flex items-start gap-2">
            <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", PRIORITY_DOT[task.priority])} />
            <p className="line-clamp-2 text-sm font-medium text-foreground">{task.title}</p>
          </div>
          <div className="flex items-center justify-between">
            {task.dueDate ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="size-3" />
                {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            ) : <span />}
            {task.assignee && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground">
                {initials}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-2.5">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", PRIORITY_DOT[task.priority])} />
              <DialogTitle className="text-base leading-snug">{task.title}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
              <span>Priority: <span className="font-medium text-foreground">{PRIORITY_LABEL[task.priority] ?? task.priority}</span></span>
              <span>Status: <span className="font-medium text-foreground">{task.status.replace(/_/g, " ")}</span></span>
              {task.dueDate && (
                <span>Due: <span className="font-medium text-foreground">
                  {new Date(task.dueDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </span></span>
              )}
              {task.assignee?.name && (
                <span>Assignee: <span className="font-medium text-foreground">{task.assignee.name}</span></span>
              )}
            </div>

            {task.description ? (
              <p className="whitespace-pre-wrap text-sm text-foreground">{task.description}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground">No description provided.</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              {canMarkDone && !isDone && (
                <Button size="sm" variant="outline" disabled={isMarkingDone}
                  onClick={() => { setDetailOpen(false); void markAsDone(); }}
                >
                  <CheckCircle2 className="mr-1.5 size-3.5" /> Mark as done
                </Button>
              )}
              {canDelete && (
                <Button size="sm" variant="destructive" disabled={isDeleting}
                  onClick={() => {
                    if (!confirm("Delete this task? This cannot be undone.")) return;
                    setDetailOpen(false);
                    void deleteTask();
                  }}
                >
                  <Trash2 className="mr-1.5 size-3.5" /> Delete
                </Button>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={() => setDetailOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}