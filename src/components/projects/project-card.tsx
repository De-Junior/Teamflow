// PASTE LOCATION: src/components/projects/project-card.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-[var(--status-in-progress)]/10 text-[var(--status-in-progress)]",
  ON_HOLD: "bg-[var(--status-review)]/10 text-[var(--status-review)]",
  COMPLETED: "bg-[var(--status-done)]/10 text-[var(--status-done)]",
  ARCHIVED: "bg-[var(--status-backlog)]/10 text-[var(--status-backlog)]",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-[var(--priority-low)]/10 text-[var(--priority-low)]",
  MEDIUM: "bg-[var(--priority-medium)]/10 text-[var(--priority-medium)]",
  HIGH: "bg-[var(--priority-high)]/10 text-[var(--priority-high)]",
  URGENT: "bg-[var(--priority-urgent)]/10 text-[var(--priority-urgent)]",
};

type ProjectCardProps = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  taskCount: number;
};

export function ProjectCard({
  id,
  name,
  description,
  status,
  priority,
  taskCount,
}: ProjectCardProps) {
  return (
    <Link href={`/projects/${id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{name}</CardTitle>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                PRIORITY_STYLES[priority]
              )}
            >
              {priority.toLowerCase()}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
            {description || "No description yet."}
          </p>
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                STATUS_STYLES[status]
              )}
            >
              {status.toLowerCase().replace("_", " ")}
            </span>
            <span className="text-xs text-muted-foreground">
              {taskCount} {taskCount === 1 ? "task" : "tasks"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}