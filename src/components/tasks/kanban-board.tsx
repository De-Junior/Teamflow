"use client";

import { useState } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast }           from "sonner";
import type { Role }       from "@prisma/client";
import { api, errorMessage } from "@/lib/api-client";
import { hasPermission }   from "@/lib/auth/permissions";
import { KanbanColumn }    from "@/components/tasks/kanban-column";
import { TaskCard, type TaskCardData } from "@/components/tasks/task-card";

const COLUMNS = [
  { status: "BACKLOG",     label: "Backlog"     },
  { status: "TODO",        label: "To do"       },
  { status: "IN_PROGRESS", label: "In progress" },
  { status: "REVIEW",      label: "Review"      },
  { status: "DONE",        label: "Done"        },
];

export function KanbanBoard({ projectId, initialTasks, userRole, onTaskClick, onTaskDeleted, onTaskMarkedDone, onTaskCreated, onTasksMoved }: {
  projectId:        string;
  initialTasks:     TaskCardData[];
  userRole:         string;
  onTaskClick?:     (id: string) => void;
  onTaskDeleted?:   (id: string) => void;
  onTaskMarkedDone?:(id: string) => void;
  onTaskCreated?:   () => void;
  onTasksMoved?:    () => void;
}) {
  const canDrag = hasPermission(userRole as Role, "task:update");
  const [tasks,      setTasks]      = useState<TaskCardData[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<TaskCardData | null>(null);

  // Adopt fresh server data when the parent passes a new list (React's
  // "adjust state when a prop changes" pattern, without an extra effect pass).
  const [syncedFrom, setSyncedFrom] = useState(initialTasks);
  if (syncedFrom !== initialTasks) {
    setSyncedFrom(initialTasks);
    setTasks(initialTasks);
  }

  // Pointer drags start after a few pixels so a tap still opens the card;
  // the keyboard sensor makes the board usable without a mouse.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(e: DragStartEvent) {
    if (!canDrag) return;
    setActiveTask(tasks.find(t => t.id === e.active.id) ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveTask(null);
    if (!over || !canDrag) return;

    const activeItem = tasks.find(t => t.id === active.id);
    if (!activeItem) return;

    const overData     = over.data.current as { type?: string; status?: string } | undefined;
    const overTask     = tasks.find(t => t.id === over.id);
    const targetStatus = overData?.type === "column" ? overData.status! : overTask?.status;
    if (!targetStatus) return;

    const srcStatus = activeItem.status;
    let newTasks: TaskCardData[];

    if (srcStatus === targetStatus) {
      const col  = tasks.filter(t => t.status === srcStatus);
      const rest = tasks.filter(t => t.status !== srcStatus);
      const oi   = col.findIndex(t => t.id === active.id);
      const ni   = col.findIndex(t => t.id === over.id);
      if (oi === ni) return;
      newTasks = [...rest, ...arrayMove(col, oi, ni)];
    } else {
      const without   = tasks.filter(t => t.id !== active.id);
      const tgtCol    = without.filter(t => t.status === targetStatus);
      const srcCol    = without.filter(t => t.status === srcStatus);
      const rest      = without.filter(t => t.status !== targetStatus && t.status !== srcStatus);
      const oi        = tgtCol.findIndex(t => t.id === over.id);
      const insertAt  = oi === -1 ? tgtCol.length : oi;
      const newTgtCol = [...tgtCol.slice(0,insertAt), { ...activeItem, status: targetStatus }, ...tgtCol.slice(insertAt)];
      newTasks = [...rest, ...newTgtCol, ...srcCol];
    }

    const previousTasks = tasks;
    setTasks(newTasks);

    const tgtUpdates = newTasks.filter(t=>t.status===targetStatus).map((t,i)=>({ id:t.id, status:targetStatus, position:i }));
    const srcUpdates = srcStatus !== targetStatus
      ? newTasks.filter(t=>t.status===srcStatus).map((t,i)=>({ id:t.id, status:srcStatus, position:i }))
      : [];

    try {
      await api.post("/api/tasks/reorder", { tasks: [...tgtUpdates, ...srcUpdates] });
      onTasksMoved?.();
    } catch (err) {
      // Roll the optimistic move back so the board never shows unsaved state.
      setTasks(previousTasks);
      toast.error(errorMessage(err));
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex snap-x gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(({ status, label }) => (
          <KanbanColumn
            key={status} status={status} label={label}
            projectId={projectId} userRole={userRole} canDrag={canDrag}
            tasks={tasks.filter(t => t.status === status)}
            onTaskCreated={onTaskCreated ?? (() => {})}
            onTaskDeleted={onTaskDeleted ?? (() => {})}
            onTaskMarkedDone={onTaskMarkedDone ?? (() => {})}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isOverlay userRole={userRole} />}
      </DragOverlay>
    </DndContext>
  );
}