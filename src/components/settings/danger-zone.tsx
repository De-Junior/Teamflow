// PASTE LOCATION: src/components/settings/danger-zone.tsx (new file)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Archive, ArrowRightLeft, Trash2, X } from "lucide-react";

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
          <AlertTriangle className="size-4" />
          Danger Zone
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        <ArchiveOrgRow organizationName={organizationName} />
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
  actionLabel,
  actionVariant = "default",
  onAction,
  disabled,
  disabledReason,
}: {
  icon: typeof Archive;
  title: string;
  description: string;
  actionLabel: string;
  actionVariant?: "default" | "destructive";
  onAction: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          {disabled && disabledReason && (
            <p className="mt-1 text-xs text-amber-600">{disabledReason}</p>
          )}
        </div>
      </div>
      <button
        onClick={onAction}
        disabled={disabled}
        className={`shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
          actionVariant === "destructive"
            ? "border-destructive/30 text-destructive hover:bg-destructive/10"
            : "border-border text-foreground hover:bg-muted"
        }`}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  confirmDisabled,
  onConfirm,
  loading,
  error,
  variant = "default",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children?: React.ReactNode;
  confirmLabel: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  loading: boolean;
  error: string | null;
  variant?: "default" | "destructive";
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5 shadow-lg">
          <div className="mb-3 flex items-start justify-between">
            <Dialog.Title className="text-sm font-semibold text-foreground">{title}</Dialog.Title>
            <Dialog.Close className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mb-4 text-sm text-muted-foreground">
            {description}
          </Dialog.Description>

          {children}

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
              Cancel
            </Dialog.Close>
            <button
              onClick={onConfirm}
              disabled={confirmDisabled || loading}
              className={`rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                variant === "destructive" ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
              }`}
            >
              {loading ? "Working..." : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------- Archive ----------

function ArchiveOrgRow({ organizationName }: { organizationName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/organizations/archive", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to archive organization");
      router.push("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <>
      <Row
        icon={Archive}
        title="Archive organization"
        description="Hides the organization and pauses billing. Can be restored later by contacting support."
        actionLabel="Archive"
        onAction={() => setOpen(true)}
      />
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Archive this organization?"
        description={`"${organizationName}" will become inaccessible to all members until it's restored. This does not delete your data.`}
        confirmLabel="Archive organization"
        onConfirm={handleArchive}
        loading={loading}
        error={error}
      />
    </>
  );
}

// ---------- Transfer ownership ----------

function TransferOwnershipRow({
  organizationName,
  otherMembers,
}: {
  organizationName: string;
  otherMembers: Member[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTransfer() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/organizations/transfer-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId: selected }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to transfer ownership");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const noMembers = otherMembers.length === 0;

  return (
    <>
      <Row
        icon={ArrowRightLeft}
        title="Transfer ownership"
        description="Make another member the owner of this organization. You'll keep your current role."
        actionLabel="Transfer"
        onAction={() => setOpen(true)}
        disabled={noMembers}
        disabledReason={noMembers ? "Invite another member before transferring ownership." : undefined}
      />
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setSelected("");
        }}
        title="Transfer organization ownership"
        description={`Choose who should become the new owner of "${organizationName}".`}
        confirmLabel="Transfer ownership"
        confirmDisabled={!selected}
        onConfirm={handleTransfer}
        loading={loading}
        error={error}
      >
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Select a member…</option>
          {otherMembers.map((m) => (
            <option key={m.membershipId} value={m.membershipId}>
              {m.name ?? m.email} ({m.email})
            </option>
          ))}
        </select>
      </ConfirmDialog>
    </>
  );
}

// ---------- Delete ----------

function DeleteOrgRow({ organizationName }: { organizationName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/organizations/delete", { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to delete organization");
      router.push("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <>
      <Row
        icon={Trash2}
        title="Delete organization"
        description="Permanently deletes this organization, all projects, tasks, and members. This cannot be undone."
        actionLabel="Delete"
        actionVariant="destructive"
        onAction={() => setOpen(true)}
      />
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setConfirmText("");
        }}
        title="Delete this organization?"
        description={`This will permanently delete "${organizationName}" and everything in it — projects, tasks, members, billing history. There is no undo.`}
        confirmLabel="Delete forever"
        confirmDisabled={confirmText !== organizationName}
        onConfirm={handleDelete}
        loading={loading}
        error={error}
        variant="destructive"
      >
        <label className="text-xs text-muted-foreground">
          Type <span className="font-medium text-foreground">{organizationName}</span> to confirm
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder={organizationName}
        />
      </ConfirmDialog>
    </>
  );
}