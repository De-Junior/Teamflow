// PASTE LOCATION: src/app/(dashboard)/settings/layout.tsx (overwrite entire file)
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session!.user.role as Role;

  const canManageOrg = hasPermission(role, "org:manage");
  const canDeleteOrg = hasPermission(role, "org:delete");
  const canManageBilling = hasPermission(role, "org:billing");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your organization and team members.
        </p>
      </div>
      <SettingsTabs
        canManageOrg={canManageOrg}
        canDeleteOrg={canDeleteOrg}
        canManageBilling={canManageBilling}
      />
      {children}
    </div>
  );
}