import { created, route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requireActor } from "@/lib/api/session";
import { createTask } from "@/services/tasks";
import { createTaskSchema } from "@/validations/project";

export const POST = route("tasks.create", async (req) => {
  const actor = await requireActor();
  const input = await parseBody(req, createTaskSchema);
  return created(await createTask(actor, input));
});
