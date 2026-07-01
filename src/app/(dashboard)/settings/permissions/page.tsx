// PASTE LOCATION: src/app/(dashboard)/settings/permissions/page.tsx
import { Role } from "@prisma/client";
import { getRolePermissions } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

const DISPLAY_ROLES: Role[] = [Role.OWNER, Role.MANAGER, Role.DEVELOPER, Role.VIEWER];

const PERMISSION_GROUPS: { label: string; permissions: string[] }[] = [
  { label: "Organization", permissions: ["org:manage", "org:billing", "org:delete"] },
  { label: "Members", permissions: ["members:invite", "members:remove", "members:role_change"] },
  {
    label: "Projects",
    permissions: ["project:create", "project:update", "project:delete", "project:archive"],
  },
  { label: "Tasks", permissions: ["task:create", "task:update", "task:delete", "task:assign"] },
  {
    label: "Comments & files",
    permissions: ["comment:create", "comment:delete", "file:upload", "file:delete"],
  },
  { label: "Reporting", permissions: ["analytics:view", "audit:view"] },
];

function formatPermission(permission: string) {
  const [, action] = permission.split(":");
  return action.replace(/_/g, " ");
}

export default function PermissionsSettingsPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        What each role can do across your organization. To change someone&apos;s role, use the{" "}
        <a href="/settings/members" className="text-primary hover:underline">
          Members
        </a>{" "}
        tab.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permission matrix</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Permission</th>
                  {DISPLAY_ROLES.map((role) => (
                    <th key={role} className="py-2 pr-3 text-center font-medium capitalize">
                      {role.toLowerCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_GROUPS.map((group) => (
                  <>
                    <tr key={group.label}>
                      <td
                        colSpan={DISPLAY_ROLES.length + 1}
                        className="pb-1.5 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground first:pt-2"
                      >
                        {group.label}
                      </td>
                    </tr>
                    {group.permissions.map((permission) => (
                      <tr key={permission} className="border-b border-border last:border-0">
                        <td className="py-2 pr-3 capitalize text-foreground">
                          {formatPermission(permission)}
                        </td>
                        {DISPLAY_ROLES.map((role) => {
                          const granted = getRolePermissions(role).includes(
                            permission as ReturnType<typeof getRolePermissions>[number]
                          );
                          return (
                            <td key={role} className="py-2 pr-3 text-center">
                              {granted && (
                                <Check className="mx-auto size-4 text-(--status-done)" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}