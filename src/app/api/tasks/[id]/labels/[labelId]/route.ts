import { prisma } from "@/lib/db/prisma";
import { notFound } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { requireTaskAccess } from "@/lib/api/task-access";

type Params = { id: string; labelId: string };

export const DELETE = route<Params>("labels.delete", async (_req, { params }) => {
  const { taskId } = await requireTaskAccess(params.id, "task:update");
  const { count } = await prisma.taskLabel.deleteMany({ where: { id: params.labelId, taskId } });
  if (count === 0) throw notFound("Label");
  return ok({ id: params.labelId });
});
