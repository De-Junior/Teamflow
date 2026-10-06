"use client";

import type { Role } from "@prisma/client";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { api, errorMessage } from "@/lib/api-client";
import { hasPermission } from "@/lib/auth/permissions";

type TaskRef = { id: string; title: string };

/**
 * Quick actions shared by the Kanban card and the list row: what the role
 * allows, plus "mark done" and "delete" with confirmation and error toasts.
 */
export function useTaskActions(
  userRole: string | undefined,
  { onDeleted, onDone }: { onDeleted?: (id: string) => void; onDone?: (id: string) => void }
) {
  const confirm = useConfirm();
  const role = userRole as Role | undefined;

  const can = {
    complete: role ? hasPermission(role, "task:update") : false,
    delete: role ? hasPermission(role, "task:delete") : false,
  };

  async function markDone(task: TaskRef) {
    try {
      await api.patch(`/api/tasks/${task.id}`, { status: "DONE" });
      onDone?.(task.id);
      toast.success(`"${task.title}" is done.`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function remove(task: TaskRef) {
    const ok = await confirm({
      title: "Delete this task?",
      description: `"${task.title}" and its subtasks, checklist, comments and time entries will be deleted. This can't be undone.`,
      confirmLabel: "Delete task",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/api/tasks/${task.id}`);
      onDeleted?.(task.id);
      toast.success("Task deleted.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return { can, markDone, remove };
}
