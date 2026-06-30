// PASTE LOCATION: src/components/profile/activity-panel.tsx (create new file)
"use client";

import { useState, useEffect } from "react";

type LogEntry = { id: string; action: string; entityType: string; createdAt: string };

const ACTION_LABEL: Record<string,string> = {
  CREATED:"created", UPDATED:"updated", DELETED:"deleted",
  ARCHIVED:"archived", INVITED:"invited", ROLE_CHANGED:"changed a role in",
  LOGIN:"logged in", LOGOUT:"logged out",
};

export function ActivityPanel() {
  const [logs, setLogs] = useState<LogEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/users/activity").then(r => r.json()).then(j => { if (j.success) setLogs(j.data); });
  }, []);

  if (!logs) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (logs.length === 0) return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;

  return (
    <div className="flex flex-col gap-4">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-3">
          <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
          <div>
            <p className="text-sm text-foreground">
              {ACTION_LABEL[log.action] ?? log.action.toLowerCase()}{" "}
              <span className="text-muted-foreground">{log.entityType.toLowerCase()}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(log.createdAt).toLocaleDateString(undefined, { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}