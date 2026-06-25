// PASTE LOCATION: src/components/dashboard/pending-invitations-banner.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Mail, X } from "lucide-react";

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
    fetch("/api/my-invitations")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setInvites(json.data);
      })
      .catch(() => {});
  }, []);

  async function handleAccept(invite: PendingInvite) {
    setProcessingToken(invite.token);
    try {
      const res = await fetch(`/api/invitations/${invite.token}`, { method: "POST" });
      const json = await res.json();

      if (!json.success) return;

      await update({ organizationId: json.data.organizationId, role: json.data.role });
      setInvites((prev) => prev.filter((i) => i.token !== invite.token));
      router.refresh();
    } finally {
      setProcessingToken(null);
    }
  }

  async function handleDecline(invite: PendingInvite) {
    setProcessingToken(invite.token);
    try {
      const res = await fetch(`/api/invitations/${invite.token}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setInvites((prev) => prev.filter((i) => i.token !== invite.token));
      }
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
          className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-accent px-4 py-3"
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