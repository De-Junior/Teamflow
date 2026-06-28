// PASTE LOCATION: src/components/projects/project-view.tsx (create new file)
"use client";

import { useState, useEffect, useCallback }    from "react";
import { useRouter }                            from "next/navigation";
import { KanbanBoardLoader }                    from "@/components/tasks/kanban-board-loader";
import { TaskDetailModal }                      from "@/components/tasks/task-detail-modal";
import { TaskListView }                         from "@/components/tasks/task-list-view";
import { TaskCalendarView }                     from "@/components/tasks/task-calendar-view";
import { TaskFilterBar }                        from "@/components/tasks/task-filter-bar";
import { ProjectHeader }                        from "@/components/projects/project-header";
import { KanbanDoneButton }                     from "@/components/tasks/kanban-done-button";
import { Button }                               from "@/components/ui/button";
import { LayoutGrid, List, Calendar }           from "lucide-react";
import { cn }                                   from "@/lib/utils";
import type { TaskCardData }                    from "@/components/tasks/task-card";

export type ProjectViewData = {
  id: string; name: string; description: string | null;
  status: string; priority: string;
  dueDate: string | null; updatedAt: string;
};
export type Member = { id: string; name: string | null; image: string | null };

type View    = "kanban" | "list" | "calendar";
type Filters = { search: string; assigneeId: string; priority: string; status: string };

const DEFAULT_FILTERS: Filters = { search: "", assigneeId: "", priority: "", status: "" };

function matchesFilters(task: TaskCardData, f: Filters) {
  if (f.search    && !task.title.toLowerCase().includes(f.search.toLowerCase())) return false;
  if (f.priority  && task.priority !== f.priority)  return false;
  if (f.status    && task.status   !== f.status)    return false;
  if (f.assigneeId && task.assignee?.id !== f.assigneeId) return false;
  return true;
}

export function ProjectView({
  project, initialTasks, members, userRole, currentUserId,
}: {
  project:      ProjectViewData;
  initialTasks: TaskCardData[];
  members:      Member[];
  userRole:     string;
  currentUserId:string;
}) {
  const router = useRouter();
  const [view,           setView]           = useState<View>("kanban");
  const [tasks,          setTasks]          = useState<TaskCardData[]>(initialTasks);
  const [filters,        setFilters]        = useState<Filters>(DEFAULT_FILTERS);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  // 30-second polling for team sync
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  const filteredTasks = tasks.filter((t) => matchesFilters(t, filters));

  const handleTaskUpdated  = useCallback(() => { router.refresh(); }, [router]);
  const handleTaskDeleted  = useCallback((id: string) => { setTasks(p => p.filter(t => t.id !== id)); router.refresh(); }, [router]);
  const handleTaskDone     = useCallback((id: string) => { setTasks(p => p.map(t => t.id === id ? { ...t, status: "DONE" } : t)); router.refresh(); }, [router]);
  const handleTaskCreated  = useCallback(() => { router.refresh(); }, [router]);
  const handleTaskClick    = useCallback((id: string) => { setSelectedTaskId(id); }, []);
  const handleModalClose   = useCallback(() => { setSelectedTaskId(null); router.refresh(); }, [router]);

  // Stats for header
  const doneCount = tasks.filter(t => t.status === "DONE").length;
  const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length;

  return (
    <>
      {/* Project Header */}
      <ProjectHeader
        project={project}
        taskCount={tasks.length}
        doneCount={doneCount}
        overdueCount={overdueCount}
        members={members}
      />

      {/* Toolbar: view toggle + filters + done button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-md border border-border p-0.5">
          {(["kanban","list","calendar"] as View[]).map((v) => {
            const Icon = v === "kanban" ? LayoutGrid : v === "list" ? List : Calendar;
            return (
              <button key={v} onClick={() => setView(v)}
                className={cn(
                  "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                  view === v ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />{v}
              </button>
            );
          })}
        </div>

        <TaskFilterBar filters={filters} onFiltersChange={setFilters} members={members} />
        <div className="ml-auto"><KanbanDoneButton /></div>
      </div>

      {/* Analytics strip */}
      <div className="flex gap-4 rounded-lg border border-border bg-card px-4 py-3">
        <Stat label="Total tasks"    value={tasks.length}  />
        <Stat label="Completed"      value={doneCount}     />
        <Stat label="In progress"    value={tasks.filter(t=>t.status==="IN_PROGRESS").length} />
        <Stat label="Overdue"        value={overdueCount}  color={overdueCount > 0 ? "text-destructive" : undefined} />
        <Stat label="Progress"       value={tasks.length > 0 ? `${Math.round(doneCount/tasks.length*100)}%` : "—"} />
      </div>

      {/* Views */}
      {view === "kanban" && (
        <KanbanBoardLoader
          projectId={project.id}
          initialTasks={filteredTasks}
          userRole={userRole}
          onTaskClick={handleTaskClick}
          onTaskDeleted={handleTaskDeleted}
          onTaskMarkedDone={handleTaskDone}
          onTaskCreated={handleTaskCreated}
        />
      )}
      {view === "list"     && <TaskListView    tasks={filteredTasks} userRole={userRole} onTaskClick={handleTaskClick} onTaskDeleted={handleTaskDeleted} />}
      {view === "calendar" && <TaskCalendarView tasks={filteredTasks} onTaskClick={handleTaskClick} />}

      {/* Task detail modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        userRole={userRole}
        currentUserId={currentUserId}
        members={members}
        onClose={handleModalClose}
        onTaskUpdated={handleTaskUpdated}
      />
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-semibold text-foreground", color)}>{value}</p>
    </div>
  );
}