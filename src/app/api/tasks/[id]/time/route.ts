import { prisma } from "@/lib/db/prisma";
import { created, ok, route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requireTaskAccess } from "@/lib/api/task-access";
import { createTimeEntrySchema } from "@/validations/task-items";

type Params = { id: string };
const withUser = { user: { select: { id: true, name: true } } } as const;

export const GET = route<Params>("time.list", async (_req, { params }) => {
  const { taskId } = await requireTaskAccess(params.id);
  return ok(await prisma.timeEntry.findMany({ where: { taskId }, orderBy: { createdAt: "desc" }, include: withUser }));
});

export const POST = route<Params>("time.create", async (req, { params }) => {
  const { actor, taskId } = await requireTaskAccess(params.id, "task:update");
  const { minutes, note } = await parseBody(req, createTimeEntrySchema);

  const entry = await prisma.timeEntry.create({
    data: { taskId, userId: actor.userId, minutes: Math.round(minutes), note: note || null },
    include: withUser,
  });
  return created(entry);
});
