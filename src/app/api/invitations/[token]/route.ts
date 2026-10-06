import { auth } from "@/lib/auth";
import { unauthorized } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { clientIp, enforce, limits } from "@/lib/api/rate-limit";
import { acceptInvitation, declineInvitation, getInvitationByToken } from "@/services/invitations";

type Params = { token: string };

async function signedInUser() {
  const session = await auth();
  if (!session?.user?.id) throw unauthorized("Please sign in to respond to this invitation.");
  return session.user;
}

/** Public: the invite page shows who invited you before you sign in. */
export const GET = route<Params>("invitations.lookup", async (req, { params }) => {
  await enforce(`invite-lookup:${clientIp(req)}`, limits.tokenRedemption);
  const invitation = await getInvitationByToken(params.token);
  return ok({ email: invitation.email, role: invitation.role, organizationName: invitation.organization.name });
});

export const POST = route<Params>("invitations.accept", async (_req, { params }) => {
  const user = await signedInUser();
  return ok(await acceptInvitation(user, params.token));
});

export const DELETE = route<Params>("invitations.decline", async (_req, { params }) => {
  const user = await signedInUser();
  return ok(await declineInvitation(user, params.token));
});
