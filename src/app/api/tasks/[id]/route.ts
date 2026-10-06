import { ok, route } from "@/lib/api/handler";
import { parseBody, parseId } from "@/lib/api/request";
import { requireActor } from "@/lib/api/session";
import { deleteTask, getTask, updateTask } from "@/services/tasks";
import { updateTaskSchema } from "@/validations/project";

type Params = { id: string };

export const GET = route<Params>("tasks.get", async (_req, { params }) => {
  const actor = await requireActor();
  return ok(await getTask(actor, parseId(params.id)));
});

export const PATCH = route<Params>("tasks.update", async (req, { params }) => {
  const actor = await requireActor();
  const input = await parseBody(req, updateTaskSchema);
  return ok(await updateTask(actor, parseId(params.id), input));
});

export const DELETE = route<Params>("tasks.delete", async (_req, { params }) => {
  const actor = await requireActor();
  return ok(await deleteTask(actor, parseId(params.id)));
});
