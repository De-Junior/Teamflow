import { forbidOnDemo } from "@/lib/api/demo-guard";
import { ok, route } from "@/lib/api/handler";
import { parseBody, parseId } from "@/lib/api/request";
import { requireActor } from "@/lib/api/session";
import { changeMemberRole, removeMember } from "@/services/members";
import { updateMemberRoleSchema } from "@/validations/team";

type Params = { id: string };

export const PATCH = route<Params>("members.change_role", async (req, { params }) => {
  const actor = await requireActor();
  forbidOnDemo(actor);
  const input = await parseBody(req, updateMemberRoleSchema);
  return ok(await changeMemberRole(actor, parseId(params.id), input));
});

export const DELETE = route<Params>("members.remove", async (_req, { params }) => {
  const actor = await requireActor();
  forbidOnDemo(actor);
  return ok(await removeMember(actor, parseId(params.id)));
});
