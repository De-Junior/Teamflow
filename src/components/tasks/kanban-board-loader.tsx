// PASTE LOCATION: src/components/tasks/kanban-board-loader.tsx (overwrite entire file)
"use client";

import dynamic          from "next/dynamic";
import type { TaskCardData } from "@/components/tasks/task-card";

const KanbanBoard = dynamic(
  () => import("@/components/tasks/kanban-board").then(m => m.KanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {["Backlog","To do","In progress","Review","Done"].map((l) => (
          <div key={l} className="w-72 shrink-0">
            <div className="mb-3 h-5 w-20 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    ),
  }
);

export function KanbanBoardLoader({ projectId, initialTasks, userRole, onTaskClick, onTaskDeleted, onTaskMarkedDone, onTaskCreated }: {
  projectId:       string;
  initialTasks:    TaskCardData[];
  userRole:        string;
  onTaskClick?:    (id: string) => void;
  onTaskDeleted?:  (id: string) => void;
  onTaskMarkedDone?:(id: string) => void;
  onTaskCreated?:  () => void;
}) {
  return (
    <KanbanBoard
      projectId={projectId} initialTasks={initialTasks} userRole={userRole}
      onTaskClick={onTaskClick} onTaskDeleted={onTaskDeleted}
      onTaskMarkedDone={onTaskMarkedDone} onTaskCreated={onTaskCreated}
    />
  );
}