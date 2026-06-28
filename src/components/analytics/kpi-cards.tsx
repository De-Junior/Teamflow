// PASTE LOCATION: src/components/analytics/kpi-cards.tsx
import { Card, CardContent } from "@/components/ui/card";
import { FolderKanban, ListChecks, TrendingUp, UserCheck } from "lucide-react";

export function KpiCards({
  projectCount,
  taskCount,
  completionRate,
  activeUserCount,
}: {
  projectCount: number;
  taskCount: number;
  completionRate: number;
  activeUserCount: number;
}) {
  const stats = [
    { label: "Projects", value: projectCount, icon: FolderKanban },
    { label: "Tasks", value: taskCount, icon: ListChecks },
    { label: "Completion rate", value: `${completionRate}%`, icon: TrendingUp },
    { label: "Active users", value: activeUserCount, icon: UserCheck },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent">
              <Icon className="size-4 text-accent-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}