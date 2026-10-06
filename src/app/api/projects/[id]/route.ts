import { ok, route } from "@/lib/api/handler";
import { parseBody, parseId } from "@/lib/api/request";
import { requireActor } from "@/lib/api/session";
import { deleteProject, getProject, updateProject } from "@/services/projects";
import { updateProjectSchema } from "@/validations/project";

type Params = { id: string };

export const GET = route<Params>("projects.get", async (_req, { params }) => {
  const actor = await requireActor();
  return ok(await getProject(actor, parseId(params.id)));
});

export const PATCH = route<Params>("projects.update", async (req, { params }) => {
  const actor = await requireActor();
  const input = await parseBody(req, updateProjectSchema);
  return ok(await updateProject(actor, parseId(params.id), input));
});

export const DELETE = route<Params>("projects.delete", async (_req, { params }) => {
  const actor = await requireActor();
  return ok(await deleteProject(actor, parseId(params.id)));
});
