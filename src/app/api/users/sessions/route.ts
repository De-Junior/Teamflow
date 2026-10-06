import { prisma } from "@/lib/db/prisma";
import { ok, route } from "@/lib/api/handler";
import { requireActor } from "@/lib/api/session";

export const GET = route("users.sessions", async () => {
  const actor = await requireActor();
  const sessions = await prisma.activeSession.findMany({
    where: { userId: actor.userId, revoked: false },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, sessionId: true, deviceLabel: true, ipAddress: true, lastSeenAt: true, createdAt: true },
  });
  const current = actor.session.user.sessionId;
  return ok(sessions.map(({ sessionId, ...s }) => ({ ...s, isCurrent: sessionId === current })));
});
