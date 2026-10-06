import { AlertTriangle, CalendarClock, CheckCircle2, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

export type Kpis = {
  openTasks: number;
  overdueTasks: number;
  dueThisWeek: number;
  completedThisWeek: number;
  completedLastWeek: number;
};

/** Compares this week's completions with last week's, in plain words. */
function completionTrend(current: number, previous: number) {
  if (current === previous) return current === 0 ? "None in the last two weeks" : "Same as the week before";
  const diff = current - previous;
  return `${diff > 0 ? "+" : ""}${diff} vs the week before`;
}

export function KpiStrip({ kpis }: { kpis: Kpis }) {
  const cards = [
    {
      label: "Open tasks",
      value: kpis.openTasks,
      hint: "Across all projects",
      icon: ListTodo,
    },
    {
      label: "Overdue",
      value: kpis.overdueTasks,
      hint: kpis.overdueTasks === 0 ? "Nothing late" : "Past their due date",
      icon: AlertTriangle,
      alert: kpis.overdueTasks > 0,
    },
    {
      label: "Due in 7 days",
      value: kpis.dueThisWeek,
      hint: "Open tasks with a due date",
      icon: CalendarClock,
    },
    {
      label: "Completed this week",
      value: kpis.completedThisWeek,
      hint: completionTrend(kpis.completedThisWeek, kpis.completedLastWeek),
      icon: CheckCircle2,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ label, value, hint, icon: Icon, alert }) => (
        <div
          key={label}
          className={cn(
            "flex flex-col gap-2 rounded-lg border bg-card p-4",
            alert ? "border-destructive/40" : "border-border"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <Icon aria-hidden className={cn("size-4", alert ? "text-destructive" : "text-muted-foreground")} />
          </div>
          <dd className={cn("text-2xl font-semibold tabular-nums leading-none", alert ? "text-destructive" : "text-foreground")}>
            {value}
          </dd>
          <dd className="text-xs text-muted-foreground">{hint}</dd>
        </div>
      ))}
    </dl>
  );
}
