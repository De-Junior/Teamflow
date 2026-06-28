// PASTE LOCATION: src/components/tasks/task-list-view.tsx (create new file)
"use client";

import { cn }         from "@/lib/utils";
import { Calendar, MessageSquare, CheckSquare, Trash2, CheckCircle2 } from "lucide-react";
import type { TaskCardData } from "@/components/tasks/task-card";

const STATUS_LABEL: Record<string,string> = {
  BACKLOG:"Backlog", TODO:"To do", IN_PROGRESS:"In progress", REVIEW:"Review", DONE:"Done",
};
const STATUS_COLOR: Record<string,string> = {
  BACKLOG:"bg-slate-400/15 text-slate-500", TODO:"bg-blue-400/15 text-blue-500",
  IN_PROGRESS:"bg-yellow-400/15 text-yellow-600", REVIEW:"bg-purple-400/15 text-purple-600",
  DONE:"bg-green-400/15 text-green-600",
};
const PRIORITY_DOT: Record<string,string> = {
  LOW:"bg-[var(--priority-low)]", MEDIUM:"bg-[var(--priority-medium)]",
  HIGH:"bg-[var(--priority-high)]", URGENT:"bg-[var(--priority-urgent)]",
};
const CAN_DELETE    = ["SUPER_ADMIN","OWNER","MANAGER"];
const CAN_MARK_DONE = ["SUPER_ADMIN","OWNER","MANAGER","DEVELOPER"];

export function TaskListView({ tasks, userRole, onTaskClick, onTaskDeleted }: {
  tasks:        TaskCardData[];
  userRole:     string;
  onTaskClick:  (id: string) => void;
  onTaskDeleted:(id: string) => void;
}) {
  const canDelete   = CAN_DELETE.includes(userRole);
  const canMarkDone = CAN_MARK_DONE.includes(userRole);

  async function markDone(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    });
    onTaskDeleted(id); // triggers refresh in parent
  }

  async function deleteTask(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    onTaskDeleted(id);
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm text-muted-foreground">No tasks match your filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* Header */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
        <span>Task</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Due date</span>
        <span className="w-16" />
      </div>

      {tasks.map((task) => {
        const initials = task.assignee?.name?.split(" ").map(p=>p[0]).slice(0,2).join("").toUpperCase();
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

        return (
          <div
            key={task.id}
            onClick={() => onTaskClick(task.id)}
            className="group grid cursor-pointer grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-0 transition-colors hover:bg-muted/30"
          >
            {/* Title */}
            <div className="flex items-start gap-2 min-w-0">
              <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", PRIORITY_DOT[task.priority])} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  {task._count.comments > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <MessageSquare className="size-3" />{task._count.comments}
                    </span>
                  )}
                  {task._count.checklistItems > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <CheckSquare className="size-3" />{task._count.checklistItems}
                    </span>
                  )}
                  {task.labels.slice(0,2).map(l => (
                    <span key={l.id} style={{ backgroundColor: l.color+"22", color: l.color }}
                      className="rounded-full px-1.5 py-0 text-[10px] font-medium">
                      {l.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Status */}
            <span className={cn("w-fit rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLOR[task.status])}>
              {STATUS_LABEL[task.status] ?? task.status}
            </span>

            {/* Priority */}
            <span className="text-xs capitalize text-muted-foreground">
              {task.priority.charAt(0)+task.priority.slice(1).toLowerCase()}
            </span>

            {/* Due date */}
            <span className={cn("flex items-center gap-1 text-xs", isOverdue ? "text-destructive" : "text-muted-foreground")}>
              {task.dueDate ? (
                <><Calendar className="size-3" />{new Date(task.dueDate).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</>
              ) : "—"}
            </span>

            {/* Actions */}
            <div className="flex w-16 items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {task.assignee && (
                <div className="flex size-5 items-center justify-center rounded-full bg-accent text-[9px] font-medium text-accent-foreground">
                  {initials}
                </div>
              )}
              {canMarkDone && task.status !== "DONE" && (
                <button onClick={(e) => void markDone(e, task.id)}
                  className="rounded p-0.5 text-muted-foreground hover:text-primary"
                  title="Mark done">
                  <CheckCircle2 className="size-3.5" />
                </button>
              )}
              {canDelete && (
                <button onClick={(e) => void deleteTask(e, task.id)}
                  className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                  title="Delete">
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}