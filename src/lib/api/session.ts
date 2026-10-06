import type { Role } from "@prisma/client";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import type { TenantContext } from "@/lib/db/tenant";
import { forbidden, unauthorized } from "./errors";

export type Actor = {
  session: Session;
  userId: string;
  role: Role;
  tenant: TenantContext;
};

/** The signed-in member and their organization, or a 401. */
export async function requireActor(): Promise<Actor> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.tenantId || !user.organizationId) throw unauthorized();
  return {
    session: session!,
    userId: user.id,
    role: user.role as Role,
    tenant: { tenantId: user.tenantId, organizationId: user.organizationId, userId: user.id },
  };
}

/** Throws 403 unless the actor's role grants the permission. */
export function authorize(actor: Pick<Actor, "role">, permission: Permission) {
  if (!hasPermission(actor.role, permission)) {
    throw forbidden(`Your role doesn't allow this (needs "${permission}").`);
  }
}

/** Convenience: sign-in check plus permission check in one call. */
export async function requirePermission(permission: Permission): Promise<Actor> {
  const actor = await requireActor();
  authorize(actor, permission);
  return actor;
}
