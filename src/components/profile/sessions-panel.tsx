// PASTE LOCATION: src/components/profile/sessions-panel.tsx (create new file)
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, LogOut } from "lucide-react";

type ActiveSession = {
  id: string; deviceLabel: string; ipAddress: string | null;
  lastSeenAt: string; createdAt: string; isCurrent: boolean;
};

export function SessionsPanel() {
  const [sessions, setSessions] = useState<ActiveSession[] | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  function load() {
    fetch("/api/users/sessions").then(r => r.json()).then(j => { if (j.success) setSessions(j.data); });
  }

  useEffect(() => {
    // Update this session's device info, then load the list
    fetch("/api/users/sessions/touch", { method: "POST" }).finally(load);
  }, []);

  async function revokeOne(id: string) {
    setRevoking(id);
    await fetch(`/api/users/sessions/${id}`, { method: "DELETE" });
    setRevoking(null);
    load();
  }

  async function revokeOthers() {
    if (!confirm("Sign out of all other devices?")) return;
    setRevokingAll(true);
    await fetch("/api/users/sessions/revoke-others", { method: "POST" });
    setRevokingAll(false);
    load();
  }

  if (!sessions) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const others = sessions.filter(s => !s.isCurrent);

  return (
    <div className="flex flex-col gap-4">
      {sessions.map((s) => (
        <div key={s.id} className="flex items-center justify-between rounded-md border border-border p-3">
          <div className="flex items-center gap-3">
            <Monitor className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {s.deviceLabel} {s.isCurrent && <span className="text-xs text-primary">(this device)</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.ipAddress ? `${s.ipAddress} · ` : ""}
                Last active {new Date(s.lastSeenAt).toLocaleString(undefined, { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}
              </p>
            </div>
          </div>
          {!s.isCurrent && (
            <Button variant="outline" size="sm" disabled={revoking === s.id} onClick={() => void revokeOne(s.id)}>
              Sign out
            </Button>
          )}
        </div>
      ))}

      {others.length > 0 && (
        <Button variant="outline" className="w-fit gap-1.5 text-destructive" disabled={revokingAll} onClick={() => void revokeOthers()}>
          <LogOut className="size-3.5" />
          {revokingAll ? "Signing out…" : `Sign out all other devices (${others.length})`}
        </Button>
      )}
    </div>
  );
}