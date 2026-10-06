import { prisma } from "@/lib/db/prisma";
import { forbidOnDemo } from "@/lib/api/demo-guard";
import { ok, route } from "@/lib/api/handler";
import { requirePermission } from "@/lib/api/session";
import { logger } from "@/lib/logger";

export const DELETE = route("organizations.delete", async () => {
  const actor = await requirePermission("org:delete");
  forbidOnDemo(actor);

  // Every tenant-owned table references Organization with onDelete: Cascade,
  // so one delete removes the organization's projects, tasks, memberships,
  // invitations, audit trail and billing records together.
  await prisma.organization.delete({ where: { id: actor.tenant.organizationId } });
  logger.info("organization.deleted", { organizationId: actor.tenant.organizationId, by: actor.userId });
  return ok({ deleted: true });
});
