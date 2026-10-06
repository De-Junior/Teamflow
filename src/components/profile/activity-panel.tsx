"use client";

import { History } from "lucide-react";
import { useApiQuery } from "@/hooks/use-api-query";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";

type LogEntry = { id: string; action: string; entityType: string; createdAt: string };

const ACTION_LABEL: Record<string, string> = {
  CREATED: "Created",
  UPDATED: "Updated",
  DELETED: "Deleted",
  ARCHIVED: "Archived",
  INVITED: "Invited someone to",
  ROLE_CHANGED: "Changed a role in",
  LOGIN: "Signed in to",
  LOGOUT: "Signed out of",
};

export function ActivityPanel() {
  const { data: logs, isPending, isError, refetch } = useApiQuery<LogEntry[]>(["me", "activity"], "/api/users/activity");

  if (isPending) return <SkeletonList rows={4} />;
  if (isError) return <ErrorState message="Your activity didn't load." onRetry={() => void refetch()} />;
  if (logs.length === 0) {
    return <EmptyState icon={History} title="No activity yet" description="Changes you make to projects, tasks and the team show up here." />;
  }

  return (
    <ol className="flex flex-col gap-4">
      {logs.map((log) => (
        <li key={log.id} className="flex items-start gap-3">
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
          <div>
            <p className="text-sm text-foreground">
              {ACTION_LABEL[log.action] ?? log.action.toLowerCase()}{" "}
              <span className="text-muted-foreground">{log.entityType.toLowerCase()}</span>
            </p>
            <time dateTime={log.createdAt} className="text-xs text-muted-foreground">
              {new Date(log.createdAt).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}
