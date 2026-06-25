// PASTE LOCATION: src/app/(dashboard)/settings/organization/page.tsx (create new file)
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationForm } from "@/components/settings/organization-form";

export default async function OrganizationSettingsPage() {
  const session = await auth();
  const canEdit = hasPermission(session!.user.role as Role, "org:manage");

  const org = await prisma.organization.findUnique({
    where: { id: session!.user.organizationId },
    select: { id: true, name: true, slug: true, createdAt: true },
  });

  if (!org) return null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent>
          <OrganizationForm initialName={org.name} canEdit={canEdit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Slug</p>
            <p className="font-mono text-sm text-foreground">{org.slug}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm text-foreground">
              {org.createdAt.toLocaleDateString(undefined, {
                year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}