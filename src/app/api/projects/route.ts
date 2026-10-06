import { created, ok, route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requireActor } from "@/lib/api/session";
import { createProject, listProjectSummaries } from "@/services/projects";
import { createProjectSchema } from "@/validations/project";

export const GET = route("projects.list", async () => {
  const actor = await requireActor();
  return ok(await listProjectSummaries(actor));
});

export const POST = route("projects.create", async (req) => {
  const actor = await requireActor();
  const input = await parseBody(req, createProjectSchema);
  return created(await createProject(actor, input));
});
