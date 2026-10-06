import { prisma } from "@/lib/db/prisma";
import { notFound } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requireTaskAccess } from "@/lib/api/task-access";
import { updateSubtaskSchema } from "@/validations/task-items";

type Params = { id: string; subtaskId: string };

export const PATCH = route<Params>("subtasks.update", async (req, { params }) => {
  const { taskId } = await requireTaskAccess(params.id, "task:update");
  const data = await parseBody(req, updateSubtaskSchema);

  const { count } = await prisma.subTask.updateMany({ where: { id: params.subtaskId, taskId }, data });
  if (count === 0) throw notFound("Subtask");
  return ok({ id: params.subtaskId });
});

export const DELETE = route<Params>("subtasks.delete", async (_req, { params }) => {
  const { taskId } = await requireTaskAccess(params.id, "task:update");
  const { count } = await prisma.subTask.deleteMany({ where: { id: params.subtaskId, taskId } });
  if (count === 0) throw notFound("Subtask");
  return ok({ id: params.subtaskId });
});
