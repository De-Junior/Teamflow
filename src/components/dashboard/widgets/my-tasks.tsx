"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api, errorMessage } from "@/lib/api-client";

export type MyTask = {
  id: string;
  title: string;
  dueDate: string | null;
  projectId: string;
  projectName: string;
  isOverdue: boolean;
};

export function MyTasksWidget({ tasks }: { tasks: MyTask[] }) {
  const router = useRouter();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  async function handleComplete(taskId: string) {
    setCompletingId(taskId);
    try {
      await api.patch(`/api/tasks/${taskId}`, { status: "DONE" });
      setCompleted((prev) => new Set(prev).add(taskId));
      toast.success("Task completed.");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setCompletingId(null);
    }
  }

  const visibleTasks = tasks.filter((t) => !completed.has(t.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">My tasks</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 pt-0">
        {visibleTasks.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Nothing assigned to you right now.
          </p>
        ) : (
          visibleTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{task.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{task.projectName}</span>
                  {task.dueDate && (
                    <span
                      className={cn(
                        task.isOverdue && "font-medium text-destructive"
                      )}
                    >
                      {task.isOverdue ? "Overdue" : "Due"}{" "}
                      {new Date(task.dueDate).toLocaleDateString("en-GB", { timeZone: "UTC",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => handleComplete(task.id)}
                  disabled={completingId === task.id}
                  title="Mark complete"
                  aria-label={`Mark "${task.title}" complete`}
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <CheckCircle2 className="size-4" />
                </button>
                <Link
                  href={`/projects/${task.projectId}`}
                  title="Open project"
                  aria-label={`Open ${task.projectName}`}
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <ExternalLink className="size-4" />
                </Link>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}