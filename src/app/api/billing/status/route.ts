import { prisma } from "@/lib/db/prisma";
import { ok, route } from "@/lib/api/handler";
import { requireActor } from "@/lib/api/session";

const FREE_PLAN = { plan: "FREE", status: "ACTIVE", currentPeriodEnd: null, cancelAtPeriodEnd: false } as const;

export const GET = route("billing.status", async () => {
  const actor = await requireActor();
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: actor.tenant.organizationId },
    select: { plan: true, status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
  });
  return ok(subscription ?? FREE_PLAN);
});
