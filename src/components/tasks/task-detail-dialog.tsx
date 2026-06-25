// PASTE LOCATION: src/components/tasks/task-detail-dialog.tsx (CREATE NEW FILE)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar, Trash2 } from "lucide-react";
import type { TaskCardData } from "@/components/tasks/task-card";

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-blue-100 text-blue-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const STATUS_STYLES: Record<string, string> = {
  BACKLOG: "bg-gray-100 text-gray-600",
  TODO: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-purple-100 text-purple-700",
  REVIEW: "bg-yellow-100 text-yellow-700",
  DONE: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "To do",
  IN_PROGRESS: "In progress",
  REVIEW: "Review",
  DONE: "Done",
};

export function TaskDetailDialog({
  task,
  open,
  onClose,
  canDelete,
  onDelete,
}: {
  task: TaskCardData;
  open: boolean;
  onClose: () => void;
  canDelete?: boolean;
  onDelete?: (id: string) => void;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const assigneeInitials = task.assignee?.name
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.ok) {
        onClose();
        onDelete?.(task.id);
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold leading-snug">
            {task.title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", PRIORITY_STYLES[task.priority])}>
                {task.priority.toLowerCase()}
              </span>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[task.status])}>
                {STATUS_LABELS[task.status] ?? task.status}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {task.description ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground">{task.description}</p>
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">No description provided.</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            {task.dueDate && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="size-3.5" />
                <span>
                  Due{" "}
                  {new Date(task.dueDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            {task.assignee && (
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground">
                  {assigneeInitials}
                </div>
                <span className="text-muted-foreground">{task.assignee.name}</span>
              </div>
            )}
          </div>
        </div>

        {canDelete && (
          <div className="flex justify-end border-t border-border pt-3">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5"
            >
              <Trash2 className="size-3.5" />
              {isDeleting ? "Deleting…" : "Delete task"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}