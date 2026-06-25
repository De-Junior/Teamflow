// PASTE LOCATION: src/components/settings/settings-tabs.tsx (create new file + folder)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SettingsTabs({ canManageOrg }: { canManageOrg: boolean }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/settings/members",      label: "Members"      },
    ...(canManageOrg
      ? [{ href: "/settings/organization", label: "Organization" }]
      : []),
  ];

  return (
    <nav className="flex border-b border-border">
      {tabs.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            pathname.startsWith(href)
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}