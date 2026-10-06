import { forbidOnDemo } from "@/lib/api/demo-guard";
import { ok, route } from "@/lib/api/handler";
import { enforce, limits } from "@/lib/api/rate-limit";
import { parseBody } from "@/lib/api/request";
import { requireActor } from "@/lib/api/session";
import { resendInvitation } from "@/services/invitations";
import { invitationActionSchema } from "@/validations/team";

export const POST = route("invitations.resend", async (req) => {
  const actor = await requireActor();
  forbidOnDemo(actor);
  const { invitationId } = await parseBody(req, invitationActionSchema);
  await enforce(`invite:${actor.tenant.tenantId}`, limits.invitations);
  return ok(await resendInvitation(actor, invitationId));
});
