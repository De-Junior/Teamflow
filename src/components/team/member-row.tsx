// PASTE LOCATION: src/components/team/member-row.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export type MemberRowData = {
  membershipId: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  joinedAt: string;
};

export function MemberRow({
  member,
  currentUserId,
  canManage,
}: {
  member: MemberRowData;
  currentUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSelf = member.userId === currentUserId;

  const initials = (member.name ?? member.email)
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleRoleChange(role: string) {
    setIsUpdating(true);
    setError(null);

    try {
      const res = await fetch(`/api/members/${member.membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.message);
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleRemove() {
    setIsUpdating(true);
    setError(null);

    try {
      const res = await fetch(`/api/members/${member.membershipId}`, { method: "DELETE" });
      const json = await res.json();

      if (!json.success) {
        setError(json.message);
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {member.name ?? member.email}
              {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
            </p>
            <p className="text-xs text-muted-foreground">{member.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManage ? (
            <Select value={member.role} onValueChange={handleRoleChange} disabled={isUpdating}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OWNER">Owner</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="DEVELOPER">Developer</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
              {member.role.toLowerCase()}
            </span>
          )}

          {canManage && !isSelf && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={4}
                  className="z-50 min-w-40 rounded-md border border-border bg-card p-1 shadow-md"
                >
                  <DropdownMenu.Item
                    className="cursor-pointer rounded-sm px-3 py-2 text-sm text-destructive outline-none hover:bg-destructive/10"
                    onSelect={handleRemove}
                  >
                    Remove member
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}