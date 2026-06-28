// PASTE LOCATION: src/app/(dashboard)/dashboard/team/page.tsx (overwrite entire file)
import { auth }              from "@/lib/auth";
import { prisma }            from "@/lib/db/prisma";
import { hasPermission }     from "@/lib/auth/permissions";
import { Role, InvitationStatus } from "@prisma/client";
import { TeamClient }        from "@/components/team/team-client";

export default async function TeamPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId;
  const canManage = hasPermission(session!.user.role as Role, "members:invite");

  const [members, invitations, recentActivity] = await Promise.all([
    prisma.membership.findMany({
      where:   { tenantId },
      orderBy: { joinedAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.invitation.findMany({
      where:   { tenantId, status: InvitationStatus.PENDING },
      orderBy: { createdAt: "desc" },
      include: { invitedBy: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.findMany({
      where:   { tenantId },
      orderBy: { createdAt: "desc" },
      take:    8,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const stats = {
    total:          members.length,
    owners:         members.filter(m => m.role === "OWNER").length,
    managers:       members.filter(m => m.role === "MANAGER").length,
    developers:     members.filter(m => m.role === "DEVELOPER").length,
    viewers:        members.filter(m => m.role === "VIEWER").length,
    pendingInvites: invitations.length,
  };

  return (
    <TeamClient
      members={members.map(m => ({
        membershipId: m.id,
        userId:       m.user.id,
        name:         m.user.name,
        email:        m.user.email,
        role:         m.role as string,
        joinedAt:     m.joinedAt.toISOString(),
      }))}
      invitations={invitations.map(inv => ({
        id:        inv.id,
        email:     inv.email,
        role:      inv.role as string,
        createdAt: inv.createdAt.toISOString(),
        expiresAt: inv.expiresAt.toISOString(),
        invitedBy: inv.invitedBy,
      }))}
      stats={stats}
      recentActivity={recentActivity.map(log => ({
        id:         log.id,
        action:     log.action as string,
        entityType: log.entityType,
        createdAt:  log.createdAt.toISOString(),
        user:       log.user,
      }))}
      currentUserId={session!.user.id}
      canManage={canManage}
    />
  );
}