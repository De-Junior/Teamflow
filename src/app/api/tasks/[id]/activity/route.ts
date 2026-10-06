import { prisma } from "@/lib/db/prisma";
import { ok, route } from "@/lib/api/handler";
import { requireTaskAccess } from "@/lib/api/task-access";

type Params = { id: string };

export const GET = route<Params>("tasks.activity", async (_req, { params }) => {
  const { actor, taskId } = await requireTaskAccess(params.id);
  const logs = await prisma.auditLog.findMany({
    where: { tenantId: actor.tenant.tenantId, entityType: "Task", entityId: taskId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, action: true, createdAt: true, metadata: true, user: { select: { name: true, email: true } } },
  });
  return ok(logs);
});
