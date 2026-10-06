import { z } from "zod";
import { getUserMembership, projectMemberRepository, writeAuditLog } from "@/lib/db/tenant";
import { validationFailed } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { idSchema, parseBody, parseId } from "@/lib/api/request";
import { authorize, requireActor } from "@/lib/api/session";
import { getProject } from "@/services/projects";

type Params = { id: string };
const memberSchema = z.object({ userId: idSchema });

export const GET = route<Params>("project_members.list", async (_req, { params }) => {
  const actor = await requireActor();
  const project = await getProject(actor, parseId(params.id));
  return ok(await projectMemberRepository(actor.tenant).listByProject(project.id));
});

export const POST = route<Params>("project_members.add", async (req, { params }) => {
  const actor = await requireActor();
  authorize(actor, "project:manage_members");
  const { userId } = await parseBody(req, memberSchema);
  const project = await getProject(actor, parseId(params.id));

  if (!(await getUserMembership(userId, actor.tenant.organizationId))) {
    throw validationFailed({ userId: "That person isn't a member of this organization." });
  }
  const member = await projectMemberRepository(actor.tenant).add(project.id, userId);
  await writeAuditLog(actor.tenant, { action: "UPDATED", entityType: "Project", entityId: project.id, metadata: { addedMember: userId } });
  return ok(member);
});

export const DELETE = route<Params>("project_members.remove", async (req, { params }) => {
  const actor = await requireActor();
  authorize(actor, "project:manage_members");
  const { userId } = await parseBody(req, memberSchema);
  const project = await getProject(actor, parseId(params.id));

  await projectMemberRepository(actor.tenant).remove(project.id, userId);
  await writeAuditLog(actor.tenant, { action: "UPDATED", entityType: "Project", entityId: project.id, metadata: { removedMember: userId } });
  return ok({ userId });
});
