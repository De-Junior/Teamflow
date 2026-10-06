import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/db/tenant";
import { ok, route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requirePermission } from "@/lib/api/session";

const renameSchema = z.object({ name: z.string().trim().min(1, "Name is required.").max(100) });

export const PATCH = route("organizations.rename", async (req) => {
  const actor = await requirePermission("org:manage");
  const { name } = await parseBody(req, renameSchema);

  await prisma.organization.update({ where: { id: actor.tenant.organizationId }, data: { name } });
  await writeAuditLog(actor.tenant, { action: "UPDATED", entityType: "Organization", entityId: actor.tenant.organizationId, metadata: { name } });
  return ok({ name });
});
