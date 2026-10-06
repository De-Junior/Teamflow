"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Monitor } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { SkeletonList } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { useApiQuery } from "@/hooks/use-api-query";
import { api, errorMessage } from "@/lib/api-client";

type ActiveSession = {
  id: string;
  deviceLabel: string;
  ipAddress: string | null;
  lastSeenAt: string;
  createdAt: string;
  isCurrent: boolean;
};

const SESSIONS_KEY = ["me", "sessions"];

export function SessionsPanel() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { data: sessions, isPending, isError, refetch } = useApiQuery<ActiveSession[]>(SESSIONS_KEY, "/api/users/sessions");
  const [busy, setBusy] = useState<string | null>(null);

  // Record this device's browser and address, then show the fresh list.
  useEffect(() => {
    api.post("/api/users/sessions/touch").then(
      () => queryClient.invalidateQueries({ queryKey: SESSIONS_KEY }),
      () => {}
    );
  }, [queryClient]);

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      await queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function revokeOthers(count: number) {
    const ok = await confirm({
      title: "Sign out of all other devices?",
      description: `${count === 1 ? "1 other device" : `${count} other devices`} will need to sign in again. This device stays signed in.`,
      confirmLabel: "Sign out others",
      destructive: true,
    });
    if (ok) await run("all", () => api.post("/api/users/sessions/revoke-others"), "Signed out of other devices.");
  }

  if (isPending) return <SkeletonList rows={2} />;
  if (isError) return <ErrorState message="Your sessions didn't load." onRetry={() => void refetch()} />;

  const others = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
            <div className="flex min-w-0 items-center gap-3">
              <Monitor aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {s.deviceLabel}{" "}
                  {s.isCurrent && <span className="text-xs font-normal text-primary">This device</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.ipAddress ? `${s.ipAddress} · ` : ""}
                  Last active{" "}
                  {new Date(s.lastSeenAt).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            {!s.isCurrent && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => void run(s.id, () => api.delete(`/api/users/sessions/${s.id}`), "Device signed out.")}
              >
                {busy === s.id ? "Signing out…" : "Sign out"}
              </Button>
            )}
          </li>
        ))}
      </ul>

      {others.length > 0 && (
        <Button
          variant="outline"
          className="w-fit gap-1.5 text-destructive"
          disabled={busy !== null}
          onClick={() => void revokeOthers(others.length)}
        >
          <LogOut className="size-3.5" />
          {busy === "all" ? "Signing out…" : "Sign out all other devices"}
        </Button>
      )}
    </div>
  );
}
