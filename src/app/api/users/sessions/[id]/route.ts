import { prisma } from "@/lib/db/prisma";
import { forbidOnDemo } from "@/lib/api/demo-guard";
import { conflict, notFound } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { parseId } from "@/lib/api/request";
import { requireActor } from "@/lib/api/session";

type Params = { id: string };

export const DELETE = route<Params>("users.revoke_session", async (_req, { params }) => {
  const actor = await requireActor();
  forbidOnDemo(actor);

  const target = await prisma.activeSession.findFirst({ where: { id: parseId(params.id), userId: actor.userId } });
  if (!target) throw notFound("Session");
  if (target.sessionId === actor.session.user.sessionId) throw conflict("Use sign out to end your current session.");

  await prisma.activeSession.update({ where: { id: target.id }, data: { revoked: true } });
  return ok({ id: target.id });
});
