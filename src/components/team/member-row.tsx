// PASTE LOCATION: src/components/team/member-row.tsx (overwrite entire file)
"use client";

import { useState }          from "react";
import { useRouter }         from "next/navigation";
import Link                  from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button }            from "@/components/ui/button";
import { MoreHorizontal, UserCircle, Trash2 } from "lucide-react";
import * as DropdownMenu     from "@radix-ui/react-dropdown-menu";

export type MemberRowData = {
  membershipId: string;
  userId:       string;
  name:         string | null;
  email:        string;
  role:         string;
  joinedAt:     string;
};

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin", OWNER: "Owner",
  MANAGER: "Manager", DEVELOPER: "Developer", VIEWER: "Viewer",
};

export function MemberRow({ member, currentUserId, canManage }: {
  member:        MemberRowData;
  currentUserId: string;
  canManage:     boolean;
}) {
  const router    = useRouter();
  const [updating, setUpdating] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const isSelf    = member.userId === currentUserId;

  const initials = (member.name ?? member.email)
    .split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  async function handleRoleChange(role: string) {
    setUpdating(true); setError(null);
    try {
      const res  = await fetch(`/api/members/${member.membershipId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.message); return; }
      router.refresh();
    } catch { setError("Something went wrong."); }
    finally  { setUpdating(false); }
  }

  async function handleRemove() {
    if (!confirm(`Remove ${member.name ?? member.email} from the organization?`)) return;
    setUpdating(true); setError(null);
    try {
      const res  = await fetch(`/api/members/${member.membershipId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) { setError(json.message); return; }
      router.refresh();
    } catch { setError("Something went wrong."); }
    finally  { setUpdating(false); }
  }

  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-0">
      <div className="flex items-center justify-between gap-3">
        {/* Avatar + info */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {member.name ?? member.email}
              {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
            </p>
            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
          </div>
        </div>

        {/* Role + joined + actions */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-xs text-muted-foreground lg:block">
            Joined {new Date(member.joinedAt).toLocaleDateString(undefined, {
              month: "short", day: "numeric", year: "numeric",
            })}
          </span>

          {canManage && !isSelf ? (
            <Select value={member.role} onValueChange={handleRoleChange} disabled={updating}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OWNER">Owner</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="DEVELOPER">Developer</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {ROLE_LABEL[member.role] ?? member.role}
            </span>
          )}

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={updating}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={4}
                className="z-50 min-w-44 rounded-md border border-border bg-card p-1 shadow-md">
                <DropdownMenu.Item asChild>
                  <Link
                    href={`/dashboard/team/${member.userId}`}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-foreground outline-none hover:bg-muted"
                  >
                    <UserCircle className="size-4" /> View profile
                  </Link>
                </DropdownMenu.Item>
                {canManage && !isSelf && (
                  <>
                    <DropdownMenu.Separator className="my-1 h-px bg-border" />
                    <DropdownMenu.Item
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive outline-none hover:bg-destructive/10"
                      onSelect={handleRemove}
                    >
                      <Trash2 className="size-4" /> Remove member
                    </DropdownMenu.Item>
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}