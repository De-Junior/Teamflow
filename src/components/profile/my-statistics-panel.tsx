"use client";

import { CheckCircle2, Clock, FolderKanban, MessageSquare } from "lucide-react";
import { useApiQuery } from "@/hooks/use-api-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";

type Stats = { tasksCompleted: number; projectsInvolved: number; commentsCount: number; hoursLogged: number };

export function MyStatisticsPanel() {
  const { data: stats, isPending, isError, refetch } = useApiQuery<Stats>(["me", "stats"], "/api/users/stats");

  if (isPending) {
    return (
      <div role="status" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <span className="sr-only">Loading</span>
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[74px]" />)}
      </div>
    );
  }
  if (isError) return <ErrorState message="Your statistics didn't load." onRetry={() => void refetch()} />;

  const cards = [
    { label: "Tasks completed", value: stats.tasksCompleted, icon: CheckCircle2 },
    { label: "Projects", value: stats.projectsInvolved, icon: FolderKanban },
    { label: "Comments", value: stats.commentsCount, icon: MessageSquare },
    { label: "Hours logged", value: stats.hoursLogged, icon: Clock },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums text-foreground">{value}</dd>
            </div>
            <Icon aria-hidden className="size-4 text-muted-foreground" />
          </CardContent>
        </Card>
      ))}
    </dl>
  );
}
