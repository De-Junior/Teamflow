import { prisma } from "@/lib/db/prisma";
import { notFound } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requireTaskAccess } from "@/lib/api/task-access";
import { updateChecklistItemSchema } from "@/validations/task-items";

type Params = { id: string; itemId: string };

export const PATCH = route<Params>("checklist.update", async (req, { params }) => {
  const { taskId } = await requireTaskAccess(params.id, "task:update");
  const data = await parseBody(req, updateChecklistItemSchema);

  const { count } = await prisma.checklistItem.updateMany({ where: { id: params.itemId, taskId }, data });
  if (count === 0) throw notFound("Checklist item");
  return ok({ id: params.itemId });
});

export const DELETE = route<Params>("checklist.delete", async (_req, { params }) => {
  const { taskId } = await requireTaskAccess(params.id, "task:update");
  const { count } = await prisma.checklistItem.deleteMany({ where: { id: params.itemId, taskId } });
  if (count === 0) throw notFound("Checklist item");
  return ok({ id: params.itemId });
});
