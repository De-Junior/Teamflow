// PASTE LOCATION: src/components/dashboard/widgets/org-statistics.tsx
import { Card, CardContent } from "@/components/ui/card";
import { FolderKanban, ListChecks, Users, TrendingUp } from "lucide-react";

export function OrgStatisticsWidget({
  projectCount,
  taskCount,
  memberCount,
  completionRate,
}: {
  projectCount: number;
  taskCount: number;
  memberCount: number;
  completionRate: number;
}) {
  const stats = [
    { label: "Projects", value: projectCount, icon: FolderKanban },
    { label: "Tasks", value: taskCount, icon: ListChecks },
    { label: "Members", value: memberCount, icon: Users },
    { label: "Completion rate", value: `${completionRate}%`, icon: TrendingUp },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent">
              <Icon className="size-4 text-accent-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-none text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}