// PASTE LOCATION: src/components/analytics/project-comparison.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ProjectComparisonRow = {
  id: string;
  name: string;
  totalTasks: number;
  completionPct: number;
  overduePct: number;
  risk: number;
};

function riskLabel(risk: number) {
  if (risk >= 60) return { label: "High", className: "text-destructive" };
  if (risk >= 30) return { label: "Medium", className: "text-[var(--priority-medium)]" };
  return { label: "Low", className: "text-[var(--status-done)]" };
}

export function ProjectComparison({ projects }: { projects: ProjectComparisonRow[] }) {
  const sorted = [...projects].sort((a, b) => b.risk - a.risk);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Project comparison</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Project</th>
                  <th className="pb-2 pr-3 font-medium">Tasks</th>
                  <th className="pb-2 pr-3 font-medium">Completion</th>
                  <th className="pb-2 pr-3 font-medium">Overdue</th>
                  <th className="pb-2 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((project) => {
                  const risk = riskLabel(project.risk);
                  return (
                    <tr key={project.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{project.totalTasks}</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${project.completionPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {project.completionPct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{project.overduePct}%</td>
                      <td className={cn("py-2.5 text-xs font-medium", risk.className)}>
                        {risk.label}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}