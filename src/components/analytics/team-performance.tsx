// PASTE LOCATION: src/components/analytics/team-performance.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Clock, AlertTriangle } from "lucide-react";

export type TeamPerformanceData = {
  mostCompleted: { name: string; completed: number }[];
  avgCompletionDays: number;
  slowestTasks: { id: string; title: string; assigneeName: string; ageDays: number }[];
};

export function TeamPerformance({ data }: { data: TeamPerformanceData }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4 text-[var(--priority-medium)]" />
            Most completed
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pt-0">
          {data.mostCompleted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed tasks yet.</p>
          ) : (
            data.mostCompleted.map((row, i) => (
              <div key={row.name} className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                  {row.name}
                </span>
                <span className="text-muted-foreground">{row.completed}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-[var(--status-in-progress)]" />
            Avg completion time
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-3xl font-semibold text-foreground">
            {data.avgCompletionDays}
            <span className="ml-1 text-sm font-normal text-muted-foreground">days</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            From creation to marked done, across all completed tasks.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-destructive" />
            Slowest open tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pt-0">
          {data.slowestTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing open right now.</p>
          ) : (
            data.slowestTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-foreground">{task.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{task.ageDays}d</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}