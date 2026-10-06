"use client";

import { useState }     from "react";
import { useRouter }    from "next/navigation";
import { Button }       from "@/components/ui/button";
import { cn }           from "@/lib/utils";
import { MoreHorizontal, RefreshCw, X } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { InvitationData } from "@/components/team/team-client";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { api, errorMessage } from "@/lib/api-client";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner", MANAGER: "Manager", DEVELOPER: "Developer", VIEWER: "Viewer",
};

export function InvitationRow({ invitation, canManage }: {
  invitation: InvitationData;
  canManage:  boolean;
}) {
  const router    = useRouter();
  const [loading, setLoading] = useState(false);
  const confirm   = useConfirm();

  const isExpired = new Date(invitation.expiresAt) < new Date();

  async function resend() {
    setLoading(true);
    try {
      await api.post("/api/invitations/resend", { invitationId: invitation.id });
      toast.success(`Invitation resent to ${invitation.email}.`);
      router.refresh();
    } catch (err) { toast.error(errorMessage(err)); }
    finally  { setLoading(false); }
  }

  async function revoke() {
    const ok = await confirm({
      title: `Revoke the invitation for ${invitation.email}?`,
      description: "The link in their email will stop working. You can invite them again later.",
      confirmLabel: "Revoke",
      destructive: true,
    });
    if (!ok) return;
    setLoading(true);
    try {
      await api.post("/api/invitations/revoke", { invitationId: invitation.id });
      toast.success("Invitation revoked.");
      router.refresh();
    } catch (err) { toast.error(errorMessage(err)); }
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
          {new Date(invitation.createdAt).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}
        </span>

        {/* Expires */}
        <span className={cn("text-xs", isExpired ? "text-destructive" : "text-muted-foreground")}>
          {isExpired
            ? "Expired"
            : new Date(invitation.expiresAt).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}
        </span>

        {/* Actions */}
        <div className="flex w-16 items-center justify-end">
          {canManage ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={loading} aria-label={`Actions for ${invitation.email}`}>
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
    </div>
  );
}