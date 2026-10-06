import { created, route } from "@/lib/api/handler";
import { parseId } from "@/lib/api/request";
import { requireActor } from "@/lib/api/session";
import { duplicateProject } from "@/services/projects";

type Params = { id: string };

export const POST = route<Params>("projects.duplicate", async (_req, { params }) => {
  const actor = await requireActor();
  return created(await duplicateProject(actor, parseId(params.id)));
});
