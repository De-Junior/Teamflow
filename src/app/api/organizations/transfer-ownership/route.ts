import { forbidOnDemo } from "@/lib/api/demo-guard";
import { ok, route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requireActor } from "@/lib/api/session";
import { transferOwnership } from "@/services/members";
import { transferOwnershipSchema } from "@/validations/team";

export const POST = route("organizations.transfer_ownership", async (req) => {
  const actor = await requireActor();
  forbidOnDemo(actor);
  const { membershipId } = await parseBody(req, transferOwnershipSchema);
  return ok(await transferOwnership(actor, membershipId));
});
