import { ok, route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requireActor } from "@/lib/api/session";
import { revokeInvitation } from "@/services/invitations";
import { invitationActionSchema } from "@/validations/team";

export const POST = route("invitations.revoke", async (req) => {
  const actor = await requireActor();
  const { invitationId } = await parseBody(req, invitationActionSchema);
  return ok(await revokeInvitation(actor, invitationId));
});
