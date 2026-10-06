import { prisma } from "@/lib/db/prisma";
import { ok, route } from "@/lib/api/handler";
import { requireActor } from "@/lib/api/session";

export const GET = route("users.tasks", async () => {
  const actor = await requireActor();
  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: { tenantId: actor.tenant.tenantId, assigneeId: actor.userId },
    orderBy: { dueDate: "asc" },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      completedAt: true,
      project: { select: { id: true, name: true } },
    },
  });

  return ok({
    upcoming: tasks.filter((t) => t.status !== "DONE" && (!t.dueDate || t.dueDate >= now)),
    overdue: tasks.filter((t) => t.status !== "DONE" && t.dueDate && t.dueDate < now),
    completed: tasks.filter((t) => t.status === "DONE"),
  });
});
