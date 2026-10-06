import { prisma } from "@/lib/db/prisma";
import { created, ok, route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requireTaskAccess } from "@/lib/api/task-access";
import { createItemSchema } from "@/validations/task-items";

type Params = { id: string };

export const GET = route<Params>("checklist.list", async (_req, { params }) => {
  const { taskId } = await requireTaskAccess(params.id);
  return ok(await prisma.checklistItem.findMany({ where: { taskId }, orderBy: { position: "asc" } }));
});

export const POST = route<Params>("checklist.create", async (req, { params }) => {
  const { taskId } = await requireTaskAccess(params.id, "task:update");
  const { title } = await parseBody(req, createItemSchema);

  const last = await prisma.checklistItem.findFirst({ where: { taskId }, orderBy: { position: "desc" } });
  return created(await prisma.checklistItem.create({ data: { taskId, title, position: (last?.position ?? -1) + 1 } }));
});
