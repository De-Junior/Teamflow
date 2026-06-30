// PASTE LOCATION: src/components/profile/my-tasks-panel.tsx (create new file)
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Task = {
  id: string; title: string; status: string; priority: string;
  dueDate: string | null; project: { id: string; name: string };
};

const PRIORITY_DOT: Record<string,string> = {
  LOW:"bg-[var(--priority-low)]", MEDIUM:"bg-[var(--priority-medium)]",
  HIGH:"bg-[var(--priority-high)]", URGENT:"bg-[var(--priority-urgent)]",
};
const TABS = [
  { id: "upcoming",  label: "Upcoming"  },
  { id: "completed", label: "Completed" },
  { id: "overdue",   label: "Overdue"   },
] as const;

export function MyTasksPanel() {
  const [data, setData] = useState<{ upcoming: Task[]; completed: Task[]; overdue: Task[] } | null>(null);
  const [tab, setTab]   = useState<typeof TABS[number]["id"]>("upcoming");

  useEffect(() => {
    fetch("/api/users/tasks").then(r => r.json()).then(j => { if (j.success) setData(j.data); });
  }, []);

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const list = data[tab];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label} <span className="text-xs text-muted-foreground">({data[id].length})</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {list.map((t) => (
            <Link key={t.id} href={`/projects/${t.project.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
              <div className="flex min-w-0 items-start gap-2">
                <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", PRIORITY_DOT[t.priority])} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.project.name}</p>
                </div>
              </div>
              {t.dueDate && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}