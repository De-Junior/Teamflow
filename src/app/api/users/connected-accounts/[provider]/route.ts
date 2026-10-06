import { prisma } from "@/lib/db/prisma";
import { forbidOnDemo } from "@/lib/api/demo-guard";
import { conflict, notFound } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { requireActor } from "@/lib/api/session";

type Params = { provider: string };

export const DELETE = route<Params>("users.disconnect_account", async (_req, { params }) => {
  const actor = await requireActor();
  forbidOnDemo(actor);

  const [accounts, user] = await Promise.all([
    prisma.account.findMany({ where: { userId: actor.userId }, select: { provider: true } }),
    prisma.user.findUnique({ where: { id: actor.userId }, select: { password: true } }),
  ]);
  if (!accounts.some((a) => a.provider === params.provider)) throw notFound("Connected account");
  // Never remove someone's only way to sign in.
  if (accounts.length <= 1 && !user?.password) {
    throw conflict("Set a password before disconnecting your only sign-in method.");
  }

  await prisma.account.deleteMany({ where: { userId: actor.userId, provider: params.provider } });
  return ok({ provider: params.provider });
});
