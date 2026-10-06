import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/db/tenant";
import { authorize, type Actor } from "@/lib/api/session";
import { conflict, notFound } from "@/lib/api/errors";
import type { UpdateMemberRoleInput } from "@/validations/team";

/** Organization membership rules: roles, removal and ownership. */

export function listMembers(actor: Actor) {
  return prisma.membership.findMany({
    where: { tenantId: actor.tenant.tenantId },
    orderBy: { joinedAt: "asc" },
    select: {
      id: true,
      role: true,
      joinedAt: true,
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });
}

async function findMembership(actor: Actor, membershipId: string) {
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, tenantId: actor.tenant.tenantId },
    select: { id: true, userId: true, role: true },
  });
  if (!membership) throw notFound("Member");
  return membership;
}

/** An organization always keeps at least one owner. */
async function assertAnotherOwnerRemains(actor: Actor) {
  const owners = await prisma.membership.count({ where: { tenantId: actor.tenant.tenantId, role: Role.OWNER } });
  if (owners <= 1) throw conflict("An organization must have at least one owner.");
}

export async function changeMemberRole(actor: Actor, membershipId: string, { role }: UpdateMemberRoleInput) {
  authorize(actor, "members:role_change");
  const membership = await findMembership(actor, membershipId);
  if (membership.role === role) return { id: membership.id, role };

  if (membership.role === Role.OWNER) await assertAnotherOwnerRemains(actor);

  await prisma.membership.update({ where: { id: membership.id }, data: { role } });
  await writeAuditLog(actor.tenant, {
    action: "ROLE_CHANGED",
    entityType: "Membership",
    entityId: membership.id,
    metadata: { userId: membership.userId, from: membership.role, to: role },
  });
  return { id: membership.id, role };
}

export async function removeMember(actor: Actor, membershipId: string) {
  authorize(actor, "members:remove");
  const membership = await findMembership(actor, membershipId);

  if (membership.userId === actor.userId) throw conflict("You can't remove yourself from the organization.");
  if (membership.role === Role.OWNER) await assertAnotherOwnerRemains(actor);

  await prisma.membership.delete({ where: { id: membership.id } });
  await writeAuditLog(actor.tenant, {
    action: "DELETED",
    entityType: "Membership",
    entityId: membership.id,
    metadata: { userId: membership.userId, role: membership.role },
  });
  return { id: membership.id };
}

/** Hands ownership to another member; the current owner becomes a manager. */
export async function transferOwnership(actor: Actor, membershipId: string) {
  authorize(actor, "org:manage");
  const target = await findMembership(actor, membershipId);
  if (target.userId === actor.userId) throw conflict("Choose another member to transfer ownership to.");

  const current = await prisma.membership.findFirst({
    where: { tenantId: actor.tenant.tenantId, userId: actor.userId },
    select: { id: true },
  });
  if (!current) throw notFound("Membership");

  await prisma.$transaction([
    prisma.membership.update({ where: { id: target.id }, data: { role: Role.OWNER } }),
    prisma.membership.update({ where: { id: current.id }, data: { role: Role.MANAGER } }),
  ]);
  await writeAuditLog(actor.tenant, {
    action: "ROLE_CHANGED",
    entityType: "Organization",
    entityId: actor.tenant.organizationId,
    metadata: { ownershipTransferredTo: target.userId },
  });
  return { ownerMembershipId: target.id };
}
