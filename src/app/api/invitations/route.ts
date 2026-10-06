import { forbidOnDemo } from "@/lib/api/demo-guard";
import { created, ok, route } from "@/lib/api/handler";
import { enforce, limits } from "@/lib/api/rate-limit";
import { parseBody } from "@/lib/api/request";
import { requireActor } from "@/lib/api/session";
import { inviteMember, listPendingInvitations } from "@/services/invitations";
import { inviteMemberSchema } from "@/validations/team";

export const GET = route("invitations.list", async () => ok(await listPendingInvitations(await requireActor())));

export const POST = route("invitations.create", async (req) => {
  const actor = await requireActor();
  forbidOnDemo(actor);
  const input = await parseBody(req, inviteMemberSchema);
  await enforce(`invite:${actor.tenant.tenantId}`, limits.invitations);
  return created(await inviteMember(actor, input));
});
