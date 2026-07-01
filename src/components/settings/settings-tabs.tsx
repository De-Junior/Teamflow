// PASTE LOCATION: src/components/settings/settings-tabs.tsx (overwrite entire file)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SettingsTabs({
  canManageOrg,
  canDeleteOrg,
  canManageBilling,
}: {
  canManageOrg: boolean;
  canDeleteOrg: boolean;
  canManageBilling: boolean;
}) {
  const pathname = usePathname();

  const tabs = [
    { href: "/settings/members", label: "Members" },
    ...(canManageOrg ? [{ href: "/settings/organization", label: "Organization" }] : []),
    { href: "/settings/permissions", label: "Permissions" },
    { href: "/settings/notifications", label: "Notifications" },
    ...(canManageBilling ? [{ href: "/settings/billing", label: "Billing" }] : []),
    { href: "/settings/security", label: "Security" },
    ...(canDeleteOrg ? [{ href: "/settings/danger", label: "Danger zone", danger: true }] : []),
  ];

  return (
    <nav className="flex overflow-x-auto border-b border-border">
      {tabs.map(({ href, label, danger }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            pathname.startsWith(href)
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
            danger && "text-destructive"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}