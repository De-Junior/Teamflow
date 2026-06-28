// PASTE LOCATION: src/components/dashboard/widgets/upcoming-deadlines.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export type DeadlineTask = {
  id: string;
  title: string;
  dueDate: string;
  projectId: string;
};

function groupByBucket(tasks: DeadlineTask[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const buckets: Record<"today" | "tomorrow" | "thisWeek", DeadlineTask[]> = {
    today: [],
    tomorrow: [],
    thisWeek: [],
  };

  for (const task of tasks) {
    const due = new Date(task.dueDate);
    if (due >= startOfToday && due < startOfTomorrow) {
      buckets.today.push(task);
    } else if (due >= startOfTomorrow && due < new Date(startOfTomorrow.getTime() + 86400000)) {
      buckets.tomorrow.push(task);
    } else if (due < endOfWeek) {
      buckets.thisWeek.push(task);
    }
  }

  return buckets;
}

const BUCKET_LABELS = {
  today: "Today",
  tomorrow: "Tomorrow",
  thisWeek: "This week",
} as const;

export function UpcomingDeadlinesWidget({ tasks }: { tasks: DeadlineTask[] }) {
  const buckets = groupByBucket(tasks);
  const hasAny = tasks.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming deadlines</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        {!hasAny ? (
          <p className="text-sm text-muted-foreground">No deadlines in the next 7 days.</p>
        ) : (
          (Object.keys(BUCKET_LABELS) as Array<keyof typeof BUCKET_LABELS>).map((key) =>
            buckets[key].length === 0 ? null : (
              <div key={key}>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {BUCKET_LABELS[key]}
                </p>
                <div className="flex flex-col gap-1.5">
                  {buckets[key].map((task) => (
                    <Link
                      key={task.id}
                      href={`/projects/${task.projectId}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted"
                    >
                      <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{task.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          )
        )}
      </CardContent>
    </Card>
  );
}