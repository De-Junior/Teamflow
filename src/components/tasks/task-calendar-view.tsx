// PASTE LOCATION: src/components/tasks/task-calendar-view.tsx (create new file)
"use client";

import { useState }      from "react";
import { cn }            from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button }        from "@/components/ui/button";
import type { TaskCardData } from "@/components/tasks/task-card";

const PRIORITY_DOT: Record<string,string> = {
  LOW:"bg-[var(--priority-low)]", MEDIUM:"bg-[var(--priority-medium)]",
  HIGH:"bg-[var(--priority-high)]", URGENT:"bg-[var(--priority-urgent)]",
};
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function TaskCalendarView({ tasks, onTaskClick }: {
  tasks:       TaskCardData[];
  onTaskClick: (id: string) => void;
}) {
  const now   = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  function prev() { if (month === 0) { setMonth(11); setYear(y=>y-1); } else setMonth(m=>m-1); }
  function next() { if (month === 11) { setMonth(0); setYear(y=>y+1); } else setMonth(m=>m+1); }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  // Map tasks by day
  const tasksByDay: Record<number, TaskCardData[]> = {};
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const d = new Date(task.dueDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!tasksByDay[day]) tasksByDay[day] = [];
      tasksByDay[day].push(task);
    }
  }

  const noDateTasks = tasks.filter(t => !t.dueDate);
  const today = new Date();
  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="flex flex-col gap-4">
      {/* Nav */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={prev}><ChevronLeft className="size-4" /></Button>
        <h2 className="w-40 text-center text-sm font-semibold text-foreground">
          {MONTH_NAMES[month]} {year}
        </h2>
        <Button variant="outline" size="sm" onClick={next}><ChevronRight className="size-4" /></Button>
      </div>

      {/* Grid */}
      <div className="overflow-hidden rounded-lg border border-border">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => (
            <div key={i}
              className={cn(
                "min-h-24 border-b border-r border-border p-1.5 last-of-type:border-r-0",
                day === null && "bg-muted/20",
                day && isToday(day) && "bg-primary/5"
              )}
            >
              {day !== null && (
                <>
                  <p className={cn(
                    "mb-1 flex size-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday(day)
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground"
                  )}>{day}</p>
                  <div className="flex flex-col gap-0.5">
                    {(tasksByDay[day] ?? []).slice(0, 3).map(task => (
                      <button
                        key={task.id}
                        onClick={() => onTaskClick(task.id)}
                        className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs text-foreground hover:bg-accent"
                      >
                        <span className={cn("size-1.5 shrink-0 rounded-full", PRIORITY_DOT[task.priority])} />
                        <span className="truncate">{task.title}</span>
                      </button>
                    ))}
                    {(tasksByDay[day]?.length ?? 0) > 3 && (
                      <span className="pl-1 text-xs text-muted-foreground">
                        +{(tasksByDay[day]?.length ?? 0) - 3} more
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* No due date */}
      {noDateTasks.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">No due date ({noDateTasks.length})</p>
          <div className="flex flex-wrap gap-2">
            {noDateTasks.map(task => (
              <button
                key={task.id}
                onClick={() => onTaskClick(task.id)}
                className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground hover:bg-accent"
              >
                <span className={cn("size-1.5 rounded-full", PRIORITY_DOT[task.priority])} />
                {task.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}