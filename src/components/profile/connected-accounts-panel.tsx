"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { SkeletonList } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { useApiQuery } from "@/hooks/use-api-query";
import { api, errorMessage } from "@/lib/api-client";

type Data = { accounts: Array<{ id: string; provider: string; providerAccountId: string }>; hasPassword: boolean };

const KEY = ["me", "connected-accounts"];

export function ConnectedAccountsPanel() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useApiQuery<Data>(KEY, "/api/users/connected-accounts");
  const [busy, setBusy] = useState(false);

  async function disconnectGoogle() {
    const ok = await confirm({
      title: "Disconnect Google?",
      description: "You won't be able to sign in with Google until you connect it again.",
      confirmLabel: "Disconnect",
      destructive: true,
    });
    if (!ok) return;

    setBusy(true);
    try {
      await api.delete("/api/users/connected-accounts/google");
      toast.success("Google disconnected.");
      await queryClient.invalidateQueries({ queryKey: KEY });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (isPending) return <SkeletonList rows={1} />;
  if (isError) return <ErrorState message="Your connected accounts didn't load." onRetry={() => void refetch()} />;

  const google = data.accounts.find((a) => a.provider === "google");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium text-foreground">Google</p>
        <p className="text-xs text-muted-foreground">
          {google ? "Connected. You can sign in with Google." : "Not connected."}
        </p>
      </div>
      {google ? (
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void disconnectGoogle()}>
          {busy ? "Disconnecting…" : "Disconnect"}
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => void signIn("google", { callbackUrl: "/dashboard/profile" })}>
          Connect
        </Button>
      )}
    </div>
  );
}
