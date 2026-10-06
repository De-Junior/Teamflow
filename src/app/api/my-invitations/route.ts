import { InvitationStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { unauthorized } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";

/** Pending invitations addressed to the signed-in user, across organizations. */
export const GET = route("invitations.mine", async () => {
  const session = await auth();
  if (!session?.user?.email) throw unauthorized();

  const invitations = await prisma.invitation.findMany({
    where: { email: session.user.email, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      role: true,
      organization: { select: { name: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });
  return ok(invitations);
});
