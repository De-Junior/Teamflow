"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Mail, X } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api-client";

type PendingInvite = {
  id: string;
  token: string;
  role: string;
  organization: { name: string };
  invitedBy: { name: string | null; email: string };
};

export function PendingInvitationsBanner() {
  const router = useRouter();
  const { update } = useSession();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [processingToken, setProcessingToken] = useState<string | null>(null);

  useEffect(() => {
    // The banner is optional chrome; if this fails the page still works.
    api.get<PendingInvite[]>("/api/my-invitations").then(setInvites, () => {});
  }, []);

  async function handleAccept(invite: PendingInvite) {
    setProcessingToken(invite.token);
    try {
      const joined = await api.post<{ organizationId: string; role: string }>(`/api/invitations/${invite.token}`);
      await update({ organizationId: joined.organizationId, role: joined.role });
      setInvites((prev) => prev.filter((i) => i.token !== invite.token));
      toast.success(`You joined ${invite.organization.name}.`);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setProcessingToken(null);
    }
  }

  async function handleDecline(invite: PendingInvite) {
    setProcessingToken(invite.token);
    try {
      await api.delete(`/api/invitations/${invite.token}`);
      setInvites((prev) => prev.filter((i) => i.token !== invite.token));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setProcessingToken(null);
    }
  }

  if (invites.length === 0) return null;

  return (
    <div className="mb-6 flex flex-col gap-2">
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="flex flex-col gap-3 rounded-md border border-primary/30 bg-accent px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-2.5">
            <Mail className="size-4 shrink-0 text-accent-foreground" />
            <p className="text-sm text-accent-foreground">
              <strong>{invite.invitedBy.name ?? invite.invitedBy.email}</strong> invited you to
              join <strong>{invite.organization.name}</strong> as a{" "}
              {invite.role.toLowerCase()}.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              disabled={processingToken === invite.token}
              onClick={() => handleAccept(invite)}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={processingToken === invite.token}
              onClick={() => handleDecline(invite)}
            >
              <X className="size-3.5" />
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}