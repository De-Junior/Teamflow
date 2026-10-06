"use client";

import { cn }         from "@/lib/utils";
import { Calendar, MessageSquare, CheckSquare, Trash2, CheckCircle2, ListFilter } from "lucide-react";
import type { TaskCardData } from "@/components/tasks/task-card";
import { useTaskActions } from "@/components/tasks/use-task-actions";
import { EmptyState } from "@/components/ui/state";

const STATUS_LABEL: Record<string,string> = {
  BACKLOG:"Backlog", TODO:"To do", IN_PROGRESS:"In progress", REVIEW:"Review", DONE:"Done",
};
const STATUS_COLOR: Record<string,string> = {
  BACKLOG:"bg-slate-400/15 text-slate-600 dark:text-slate-300", TODO:"bg-blue-400/15 text-blue-600 dark:text-blue-300",
  IN_PROGRESS:"bg-yellow-400/15 text-yellow-700 dark:text-yellow-300", REVIEW:"bg-purple-400/15 text-purple-700 dark:text-purple-300",
  DONE:"bg-green-400/15 text-green-700 dark:text-green-300",
};
const PRIORITY_DOT: Record<string,string> = {
  LOW:"bg-[var(--priority-low)]", MEDIUM:"bg-[var(--priority-medium)]",
  HIGH:"bg-[var(--priority-high)]", URGENT:"bg-[var(--priority-urgent)]",
};

export function TaskListView({ tasks, userRole, onTaskClick, onTaskDeleted, onTaskMarkedDone }: {
  tasks:            TaskCardData[];
  userRole:         string;
  onTaskClick:      (id: string) => void;
  onTaskDeleted:    (id: string) => void;
  onTaskMarkedDone: (id: string) => void;
}) {
  const { can, markDone, remove } = useTaskActions(userRole, { onDeleted: onTaskDeleted, onDone: onTaskMarkedDone });

  if (tasks.length === 0) {
    return <EmptyState icon={ListFilter} title="No tasks here" description="Nothing matches the current filters. Clear them or add a task from the board." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="hidden grid-cols-[minmax(0,2fr)_7rem_6rem_6rem_4.5rem] gap-3 border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
        <span>Task</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Due</span>
        <span className="sr-only">Actions</span>
      </div>

      <ul>
        {tasks.map((task) => {
          const initials  = task.assignee?.name?.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
          const isOverdue = Boolean(task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE");
          const due       = task.dueDate
            ? new Date(task.dueDate).toLocaleDateString("en-GB", { timeZone: "UTC", month: "short", day: "numeric" })
            : null;

          return (
            <li
              key={task.id}
              className="group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-muted/30 md:grid-cols-[minmax(0,2fr)_7rem_6rem_6rem_4.5rem]"
            >
              {/* Title. The button's ::after covers the row, so the whole row opens the task. */}
              <div className="flex min-w-0 items-start gap-2">
                <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", PRIORITY_DOT[task.priority])} />
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onTaskClick(task.id)}
                    className="block max-w-full truncate text-left text-sm font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
                  >
                    {task.title}
                  </button>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {/* On small screens the status and due date move under the title. */}
                    <span className={cn("rounded-full px-2 py-0.5 font-medium md:hidden", STATUS_COLOR[task.status])}>
                      {STATUS_LABEL[task.status] ?? task.status}
                    </span>
                    {due && (
                      <span className={cn("flex items-center gap-1 md:hidden", isOverdue && "text-destructive")}>
                        <Calendar aria-hidden className="size-3" />{due}
                      </span>
                    )}
                    {task._count.comments > 0 && (
                      <span className="flex items-center gap-0.5">
                        <MessageSquare aria-hidden className="size-3" />{task._count.comments}
                        <span className="sr-only">comments</span>
                      </span>
                    )}
                    {task._count.checklistItems > 0 && (
                      <span className="flex items-center gap-0.5">
                        <CheckSquare aria-hidden className="size-3" />{task._count.checklistItems}
                        <span className="sr-only">checklist items</span>
                      </span>
                    )}
                    {task.labels.slice(0, 2).map(l => (
                      <span key={l.id} style={{ backgroundColor: l.color + "22", color: l.color }}
                        className="rounded-full px-1.5 py-0 text-[10px] font-medium">
                        {l.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <span className={cn("hidden w-fit rounded-full px-2 py-0.5 text-xs font-medium md:block", STATUS_COLOR[task.status])}>
                {STATUS_LABEL[task.status] ?? task.status}
              </span>

              <span className="hidden text-xs text-muted-foreground md:block">
                {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
              </span>

              <span className={cn("hidden items-center gap-1 text-xs md:flex", isOverdue ? "font-medium text-destructive" : "text-muted-foreground")}>
                {due ? <><Calendar aria-hidden className="size-3" />{due}</> : <span aria-label="No due date">—</span>}
              </span>

              {/* Above the row-sized link so these stay clickable */}
              <div className="relative z-10 flex items-center justify-end gap-1">
                {task.assignee && (
                  <span title={task.assignee.name ?? undefined}
                    className="flex size-5 items-center justify-center rounded-full bg-accent text-[9px] font-medium text-accent-foreground">
                    <span aria-hidden>{initials}</span>
                    <span className="sr-only">Assigned to {task.assignee.name}</span>
                  </span>
                )}
                {can.complete && task.status !== "DONE" && (
                  <button onClick={() => void markDone(task)}
                    className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                    aria-label={`Mark "${task.title}" done`} title="Mark done">
                    <CheckCircle2 className="size-3.5" />
                  </button>
                )}
                {can.delete && (
                  <button onClick={() => void remove(task)}
                    className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                    aria-label={`Delete "${task.title}"`} title="Delete">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
