// src/components/dashboard/sidebar.tsx (overwrite entire file)
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FolderKanban, Users, Settings, BarChart3, X } from "lucide-react";
import { useSidebar } from "@/components/dashboard/sidebar-context";

const NAV_ITEMS = [
  { href: "/dashboard",         label: "Overview",   icon: LayoutDashboard },
  { href: "/projects",          label: "Projects",   icon: FolderKanban    },
  { href: "/dashboard/team",    label: "Team",       icon: Users           },
  { href: "/analytics",         label: "Analytics",  icon: BarChart3       },
  { href: "/settings/members",  label: "Settings",   icon: Settings        },
];

export function Sidebar({ }: { organizationName?: string }) {
  const pathname = usePathname();
  const { isOpen, setIsOpen } = useSidebar();

  return (
    <>
      <div
        onClick={() => setIsOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-60 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Image
            src="/teamflow_logo.png"
            alt="TeamFlow"
            width={1877}
            height={838}
            style={{ width: "auto", height: "40px" }}
            priority
          />
          <button
            onClick={() => setIsOpen(false)}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}