import { prisma } from "@/lib/db/prisma";
import { forbidOnDemo } from "@/lib/api/demo-guard";
import { ok, route } from "@/lib/api/handler";
import { requireActor } from "@/lib/api/session";

export const POST = route("users.revoke_other_sessions", async () => {
  const actor = await requireActor();
  forbidOnDemo(actor);
  const { count } = await prisma.activeSession.updateMany({
    where: { userId: actor.userId, sessionId: { not: actor.session.user.sessionId }, revoked: false },
    data: { revoked: true },
  });
  return ok({ revoked: count });
});
