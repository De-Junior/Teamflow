// PASTE LOCATION: src/components/profile/my-statistics-panel.tsx (create new file)
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent }   from "@/components/ui/card";
import { CheckCircle2, FolderKanban, MessageSquare, FileText } from "lucide-react";

type Stats = { tasksCompleted: number; projectsInvolved: number; commentsCount: number; filesUploaded: number };

export function MyStatisticsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/users/stats").then(r => r.json()).then(j => { if (j.success) setStats(j.data); });
  }, []);

  if (!stats) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const cards = [
    { label: "Tasks completed", value: stats.tasksCompleted,   icon: CheckCircle2 },
    { label: "Projects",        value: stats.projectsInvolved, icon: FolderKanban },
    { label: "Comments",        value: stats.commentsCount,    icon: MessageSquare },
    { label: "Files uploaded",  value: stats.filesUploaded,    icon: FileText },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold text-foreground">{value}</p>
            </div>
            <Icon className="size-4 text-muted-foreground" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}