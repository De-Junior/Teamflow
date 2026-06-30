// PASTE LOCATION: src/components/profile/connected-accounts-panel.tsx (create new file)
"use client";

import { useState, useEffect } from "react";
import { signIn }   from "next-auth/react";
import { Button }   from "@/components/ui/button";

type Data = { accounts: Array<{ id: string; provider: string; providerAccountId: string }>; hasPassword: boolean };

const PROVIDER_LABEL: Record<string, string> = { google: "Google" };

export function ConnectedAccountsPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch("/api/users/connected-accounts").then(r => r.json()).then(j => { if (j.success) setData(j.data); });
  }
  useEffect(() => { load(); }, []);

  async function disconnect(provider: string) {
    if (!confirm(`Disconnect ${PROVIDER_LABEL[provider] ?? provider}?`)) return;
    setBusy(provider); setError(null);
    try {
      const res  = await fetch(`/api/users/connected-accounts/${provider}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) { setError(json.message); return; }
      load();
    } finally { setBusy(null); }
  }

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const connectedGoogle = data.accounts.find(a => a.provider === "google");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-md border border-border p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Google</p>
          <p className="text-xs text-muted-foreground">
            {connectedGoogle ? "Connected" : "Not connected"}
          </p>
        </div>
        {connectedGoogle ? (
          <Button variant="outline" size="sm" disabled={busy === "google"} onClick={() => void disconnect("google")}>
            Disconnect
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => void signIn("google")}>
            Connect
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}