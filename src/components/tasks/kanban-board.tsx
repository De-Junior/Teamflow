// PASTE LOCATION: src/components/tasks/kanban-board.tsx (overwrite entire file)
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/tasks/kanban-column";
import { TaskCard, type TaskCardData } from "@/components/tasks/task-card";

const COLUMNS = [
  { status: "BACKLOG",     label: "Backlog" },
  { status: "TODO",        label: "To do" },
  { status: "IN_PROGRESS", label: "In progress" },
  { status: "REVIEW",      label: "Review" },
  { status: "DONE",        label: "Done" },
];

export function KanbanBoard({
  projectId,
  initialTasks,
  userRole,
}: {
  projectId: string;
  initialTasks: TaskCardData[];
  userRole?: string;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskCardData[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<TaskCardData | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  useEffect(() => {
    function onVisibilityChange() {
      if (!document.hidden) router.refresh();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [router]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === event.active.id) ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeTaskItem = tasks.find((t) => t.id === active.id);
    if (!activeTaskItem) return;

    const overData = over.data.current as { type?: string; status?: string } | undefined;
    const overTask = tasks.find((t) => t.id === over.id);
    const targetStatus = overData?.type === "column" ? overData.status! : overTask?.status;
    if (!targetStatus) return;

    const sourceStatus = activeTaskItem.status;
    const withoutActive = tasks.filter((t) => t.id !== active.id);

    const targetColumnTasks = withoutActive.filter((t) => t.status === targetStatus);
    const overIndex = targetColumnTasks.findIndex((t) => t.id === over.id);
    const insertAt = overIndex === -1 ? targetColumnTasks.length : overIndex;
    targetColumnTasks.splice(insertAt, 0, { ...activeTaskItem, status: targetStatus });

    const sourceColumnTasks =
      sourceStatus !== targetStatus
        ? withoutActive.filter((t) => t.status === sourceStatus)
        : [];

    const otherTasks = withoutActive.filter(
      (t) => t.status !== targetStatus && t.status !== sourceStatus
    );

    setTasks([...otherTasks, ...targetColumnTasks, ...sourceColumnTasks]);

    const updates = [
      ...targetColumnTasks.map((t, position) => ({ id: t.id, status: targetStatus, position })),
      ...(sourceStatus !== targetStatus
        ? sourceColumnTasks.map((t, position) => ({ id: t.id, status: sourceStatus, position }))
        : []),
    ];

    try {
      const res = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: updates }),
      });
      if (!res.ok) {
        router.refresh();
      }
    } catch {
      router.refresh();
    }
  }

  function handleTaskDeleted(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  function handleTaskMarkedDone(taskId: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "DONE" } : t)));
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(({ status, label }) => (
          <KanbanColumn
            key={status}
            status={status}
            label={label}
            projectId={projectId}
            tasks={tasks.filter((t) => t.status === status)}
            onTaskCreated={() => router.refresh()}
            userRole={userRole}
            onTaskDeleted={handleTaskDeleted}
            onTaskMarkedDone={handleTaskMarkedDone}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isOverlay />}
      </DragOverlay>
    </DndContext>
  );
}