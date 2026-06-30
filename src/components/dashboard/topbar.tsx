// PASTE LOCATION: src/components/dashboard/topbar.tsx (overwrite entire file)
"use client";

import { signOut } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Avatar from "@radix-ui/react-avatar";
import { ChevronDown, LogOut, User, Menu } from "lucide-react";
import { useSidebar } from "@/components/dashboard/sidebar-context";

export function Topbar({
  userName,
  userEmail,
  role,
}: {
  userName: string;
  userEmail: string;
  role: string;
}) {
  const { setIsOpen } = useSidebar();

  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <button
        onClick={() => setIsOpen(true)}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
            <Avatar.Root className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-medium text-accent-foreground">
              <Avatar.Fallback>{initials}</Avatar.Fallback>
            </Avatar.Root>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-foreground">{userName}</span>
              <span className="text-[11px] text-muted-foreground">{userEmail}</span>
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-50 min-w-56 rounded-md border border-border bg-card p-1 shadow-md"
          >
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
              <p className="mt-1 text-xs capitalize text-muted-foreground">
                {role.toLowerCase()}
              </p>
            </div>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-foreground outline-none hover:bg-muted"
              onSelect={() => {
                window.location.href = "/dashboard/profile";
              }}
            >
              <User className="size-4" />
              Profile
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive outline-none hover:bg-destructive/10"
              onSelect={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="size-4" />
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}