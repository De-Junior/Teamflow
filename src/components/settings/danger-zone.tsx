"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AlertTriangle, ArrowRightLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, errorMessage } from "@/lib/api-client";

interface Member {
  membershipId: string;
  name: string | null;
  email: string;
}

export function DangerZone({
  organizationName,
  otherMembers,
}: {
  organizationName: string;
  otherMembers: Member[];
}) {
  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <AlertTriangle aria-hidden className="size-4" />
          Danger zone
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        <TransferOwnershipRow organizationName={organizationName} otherMembers={otherMembers} />
        <DeleteOrgRow organizationName={organizationName} />
      </CardContent>
    </Card>
  );
}

function Row({
  icon: Icon,
  title,
  description,
  note,
  action,
}: {
  icon: typeof Trash2;
  title: string;
  description: string;
  note?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex gap-3">
        <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          {note && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{note}</p>}
        </div>
      </div>
      <div className="shrink-0 pl-7 sm:pl-0">{action}</div>
    </div>
  );
}

function TransferOwnershipRow({
  organizationName,
  otherMembers,
}: {
  organizationName: string;
  otherMembers: Member[];
}) {
  const router = useRouter();
  const { update } = useSession();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTransfer() {
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/organizations/transfer-ownership", { membershipId: selected });
      // The server made the previous owner a Manager; refresh the session to match.
      await update({ role: "MANAGER" });
      setOpen(false);
      toast.success("Ownership transferred.");
      router.push("/settings");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const noMembers = otherMembers.length === 0;

  return (
    <Row
      icon={ArrowRightLeft}
      title="Transfer ownership"
      description="Make another member the owner. You'll become a Manager."
      note={noMembers ? "Invite another member before transferring ownership." : undefined}
      action={
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setSelected("");
              setError(null);
            }
          }}
        >
          <Button variant="outline" size="sm" disabled={noMembers} onClick={() => setOpen(true)}>
            Transfer
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer ownership</DialogTitle>
              <DialogDescription>
                Choose who should own &ldquo;{organizationName}&rdquo;. They&apos;ll control billing and can delete the
                organization. You&apos;ll stay on as a Manager.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-owner">New owner</Label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger id="new-owner">
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {otherMembers.map((m) => (
                    <SelectItem key={m.membershipId} value={m.membershipId}>
                      {m.name ? `${m.name} (${m.email})` : m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={!selected || loading} onClick={() => void handleTransfer()}>
                {loading ? "Transferring…" : "Transfer ownership"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  );
}

function DeleteOrgRow({ organizationName }: { organizationName: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      await api.delete("/api/organizations/delete");
      // The session still points at the deleted organization, so start a fresh one.
      await signOut({ callbackUrl: "/login" });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Row
      icon={Trash2}
      title="Delete organization"
      description="Permanently deletes this organization with all its projects, tasks and members."
      action={
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setConfirmText("");
              setError(null);
            }
          }}
        >
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => setOpen(true)}
          >
            Delete
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this organization?</DialogTitle>
              <DialogDescription>
                &ldquo;{organizationName}&rdquo; and everything in it (projects, tasks, members and billing history) will be
                deleted for good. This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-org-name">
                Type <span className="font-semibold">{organizationName}</span> to confirm
              </Label>
              <Input
                id="confirm-org-name"
                autoComplete="off"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={confirmText !== organizationName || loading}
                onClick={() => void handleDelete()}
              >
                {loading ? "Deleting…" : "Delete forever"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  );
}
