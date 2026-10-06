import { prisma } from "@/lib/db/prisma";
import { created, ok, route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requireTaskAccess } from "@/lib/api/task-access";
import { createItemSchema } from "@/validations/task-items";

type Params = { id: string };

export const GET = route<Params>("subtasks.list", async (_req, { params }) => {
  const { taskId } = await requireTaskAccess(params.id);
  return ok(await prisma.subTask.findMany({ where: { taskId }, orderBy: { position: "asc" } }));
});

export const POST = route<Params>("subtasks.create", async (req, { params }) => {
  const { taskId } = await requireTaskAccess(params.id, "task:update");
  const { title } = await parseBody(req, createItemSchema);

  const last = await prisma.subTask.findFirst({ where: { taskId }, orderBy: { position: "desc" } });
  return created(await prisma.subTask.create({ data: { taskId, title, position: (last?.position ?? -1) + 1 } }));
});
