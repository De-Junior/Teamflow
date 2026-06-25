// PASTE LOCATION: src/app/(dashboard)/dashboard/team/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { Role, InvitationStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { MemberRow } from "@/components/team/member-row";
import { Mail } from "lucide-react";

export default async function TeamPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId;
  const canManage = hasPermission(session!.user.role as Role, "members:invite");

  const [members, pendingInvitations] = await Promise.all([
    prisma.membership.findMany({
      where: { tenantId },
      orderBy: { joinedAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.invitation.findMany({
      where: { tenantId, status: InvitationStatus.PENDING },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "member" : "members"}
            {pendingInvitations.length > 0 &&
              ` · ${pendingInvitations.length} pending invite${pendingInvitations.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {canManage && <InviteMemberDialog />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {members.map((member: (typeof members)[number]) => (
            <MemberRow
              key={member.id}
              member={{
                membershipId: member.id,
                userId: member.user.id,
                name: member.user.name,
                email: member.user.email,
                role: member.role,
                joinedAt: member.joinedAt.toISOString(),
              }}
              currentUserId={session!.user.id}
              canManage={canManage}
            />
          ))}
        </CardContent>
      </Card>

      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending invitations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            {pendingInvitations.map((invite: (typeof pendingInvitations)[number]) => (
              <div key={invite.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{invite.email}</span>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                  {invite.role.toLowerCase()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}