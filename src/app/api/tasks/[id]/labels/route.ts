import { prisma } from "@/lib/db/prisma";
import { created, route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requireTaskAccess } from "@/lib/api/task-access";
import { createLabelSchema } from "@/validations/task-items";

type Params = { id: string };

export const POST = route<Params>("labels.create", async (req, { params }) => {
  const { taskId } = await requireTaskAccess(params.id, "task:update");
  const { name, color } = await parseBody(req, createLabelSchema);
  return created(await prisma.taskLabel.create({ data: { taskId, name, color: color ?? "#6366f1" } }));
});
