// PASTE LOCATION: src/app/(dashboard)/settings/danger/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";
import { DangerZone } from "@/components/settings/danger-zone";

export default async function DangerZoneSettingsPage() {
  const session = await auth();
  const canDelete = hasPermission(session!.user.role as Role, "org:delete");

  if (!canDelete) {
    redirect("/settings/members");
  }

  const [organization, otherMemberships] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: session!.user.organizationId },
      select: { name: true },
    }),
    prisma.membership.findMany({
      where: { tenantId: session!.user.tenantId, userId: { not: session!.user.id } },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <DangerZone
        organizationName={organization?.name ?? "your organization"}
        otherMembers={otherMemberships.map((m: (typeof otherMemberships)[number]) => ({
          membershipId: m.id,
          name: m.user.name,
          email: m.user.email,
        }))}
      />
    </div>
  );
}