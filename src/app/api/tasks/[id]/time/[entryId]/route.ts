import { prisma } from "@/lib/db/prisma";
import { forbidden, notFound } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { canModerate, requireTaskAccess } from "@/lib/api/task-access";

type Params = { id: string; entryId: string };

export const DELETE = route<Params>("time.delete", async (_req, { params }) => {
  const { actor, taskId } = await requireTaskAccess(params.id);

  const entry = await prisma.timeEntry.findFirst({ where: { id: params.entryId, taskId }, select: { id: true, userId: true } });
  if (!entry) throw notFound("Time entry");
  if (!canModerate(actor.role) && entry.userId !== actor.userId) throw forbidden("You can only delete your own time entries.");

  await prisma.timeEntry.delete({ where: { id: entry.id } });
  return ok({ id: entry.id });
});
