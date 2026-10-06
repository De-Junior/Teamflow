import { prisma } from "@/lib/db/prisma";
import { ok, route } from "@/lib/api/handler";
import { requireActor } from "@/lib/api/session";

export const GET = route("users.activity", async () => {
  const actor = await requireActor();
  const logs = await prisma.auditLog.findMany({
    where: { tenantId: actor.tenant.tenantId, userId: actor.userId },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { id: true, action: true, entityType: true, entityId: true, metadata: true, createdAt: true },
  });
  return ok(logs);
});
