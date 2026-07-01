"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { UserPlus, Check } from "lucide-react";
import type { Member } from "@/components/projects/project-view";

export function ProjectMembersManager({
  projectId,
  members,
  allOrgMembers,
  onMembersChanged,
}: {
  projectId:        string;
  members:          Member[];
  allOrgMembers:    Member[];
  onMembersChanged: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const memberIds = new Set(members.map((m) => m.id));

  async function toggle(userId: string, isMember: boolean) {
    setPending(userId);
    try {
      await fetch(`/api/projects/${projectId}/members`, {
        method:  isMember ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId }),
      });
      onMembersChanged();
    } catch {
      /* silent */
    } finally {
      setPending(null);
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          <UserPlus className="size-3.5" /> Assign members
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-50 max-h-72 w-64 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-md"
        >
          {allOrgMembers.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No organization members found.</p>
          )}
          {allOrgMembers.map((u) => {
            const isMember = memberIds.has(u.id);
            return (
              <DropdownMenu.Item
                key={u.id}
                onSelect={(e) => { e.preventDefault(); toggle(u.id, isMember); }}
                disabled={pending === u.id}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted"
              >
                <span>{u.name ?? "Unnamed user"}</span>
                {isMember && <Check className="size-3.5 text-green-500" />}
                {pending === u.id && <span className="text-xs text-muted-foreground">…</span>}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
