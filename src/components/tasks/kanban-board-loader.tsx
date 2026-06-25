// PASTE LOCATION: src/components/tasks/kanban-board-loader.tsx (overwrite entire file)
"use client";

import dynamic from "next/dynamic";
import type { TaskCardData } from "@/components/tasks/task-card";

const KanbanBoard = dynamic(
  () => import("@/components/tasks/kanban-board").then((mod) => mod.KanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {["Backlog", "To do", "In progress", "Review", "Done"].map((label) => (
          <div key={label} className="w-72 shrink-0">
            <div className="mb-3 h-5 w-20 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    ),
  }
);

export function KanbanBoardLoader({
  projectId,
  initialTasks,
  userRole,
}: {
  projectId: string;
  initialTasks: (TaskCardData & { status: string })[];
  userRole?: string;
}) {
  return (
    <KanbanBoard
      projectId={projectId}
      initialTasks={initialTasks}
      userRole={userRole}
    />
  );
}