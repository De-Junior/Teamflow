// PASTE LOCATION: src/components/team/invitation-row.tsx (create new file)
"use client";

import { useState }     from "react";
import { useRouter }    from "next/navigation";
import { Button }       from "@/components/ui/button";
import { cn }           from "@/lib/utils";
import { MoreHorizontal, RefreshCw, X } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { InvitationData } from "@/components/team/team-client";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner", MANAGER: "Manager", DEVELOPER: "Developer", VIEWER: "Viewer",
};

export function InvitationRow({ invitation, canManage }: {
  invitation: InvitationData;
  canManage:  boolean;
}) {
  const router    = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [resent,  setResent]  = useState(false);

  const isExpired = new Date(invitation.expiresAt) < new Date();

  async function resend() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/invitations/resend", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: invitation.id }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.message); return; }
      setResent(true);
      setTimeout(() => setResent(false), 3000);
      router.refresh();
    } catch { setError("Something went wrong."); }
    finally  { setLoading(false); }
  }

  async function revoke() {
    if (!confirm(`Revoke invitation for ${invitation.email}?`)) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/invitations/revoke", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: invitation.id }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.message); return; }
      router.refresh();
    } catch { setError("Something went wrong."); }
    finally  { setLoading(false); }
  }

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-3 border-b border-border py-3 last:border-0">
        {/* Email */}
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">{invitation.email}</p>
          <p className="truncate text-xs text-muted-foreground">
            by {invitation.invitedBy.name ?? invitation.invitedBy.email}
          </p>
        </div>

        {/* Role */}
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {ROLE_LABEL[invitation.role] ?? invitation.role}
        </span>

        {/* Sent */}
        <span className="text-xs text-muted-foreground">
          {new Date(invitation.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>

        {/* Expires */}
        <span className={cn("text-xs", isExpired ? "text-destructive" : "text-muted-foreground")}>
          {isExpired
            ? "Expired"
            : new Date(invitation.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>

        {/* Actions */}
        <div className="flex w-16 items-center justify-end">
          {resent ? (
            <span className="text-xs font-medium text-green-600">Sent!</span>
          ) : canManage ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={loading}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={4}
                  className="z-50 min-w-44 rounded-md border border-border bg-card p-1 shadow-md">
                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-foreground outline-none hover:bg-muted"
                    onSelect={resend}
                  >
                    <RefreshCw className="size-3.5" /> Resend invite
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive outline-none hover:bg-destructive/10"
                    onSelect={revoke}
                  >
                    <X className="size-3.5" /> Revoke
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : null}
        </div>
      </div>
      {error && <p className="pb-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}