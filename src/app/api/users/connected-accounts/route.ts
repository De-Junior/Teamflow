import { prisma } from "@/lib/db/prisma";
import { ok, route } from "@/lib/api/handler";
import { requireActor } from "@/lib/api/session";

export const GET = route("users.connected_accounts", async () => {
  const actor = await requireActor();
  const [accounts, user] = await Promise.all([
    prisma.account.findMany({ where: { userId: actor.userId }, select: { id: true, provider: true, providerAccountId: true } }),
    prisma.user.findUnique({ where: { id: actor.userId }, select: { password: true } }),
  ]);
  return ok({ accounts, hasPassword: Boolean(user?.password) });
});
