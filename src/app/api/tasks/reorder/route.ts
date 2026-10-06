import { ok, route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requireActor } from "@/lib/api/session";
import { reorderTasks } from "@/services/tasks";
import { reorderTasksSchema } from "@/validations/project";

export const POST = route("tasks.reorder", async (req) => {
  const actor = await requireActor();
  const input = await parseBody(req, reorderTasksSchema);
  return ok(await reorderTasks(actor, input));
});
