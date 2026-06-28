// PASTE LOCATION: src/components/projects/project-card.tsx (overwrite entire file)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  MoreHorizontal, Edit2, Archive, Trash2, Copy,
  Calendar, CheckCircle2, ArchiveRestore,
} from "lucide-react";

export type ProjectData = {
  id:          string;
  name:        string;
  description: string | null;
  status:      string;
  priority:    string;
  dueDate:     string | null;
  createdAt:   string;
  updatedAt:   string;
  taskCount:   number;
  doneCount:   number;
  members:     { id: string; name: string | null; image: string | null }[];
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:    "bg-blue-500/10 text-blue-600",
  ON_HOLD:   "bg-yellow-500/10 text-yellow-700",
  COMPLETED: "bg-green-500/10 text-green-600",
  ARCHIVED:  "bg-slate-400/10 text-slate-500",
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active", ON_HOLD: "On hold", COMPLETED: "Completed", ARCHIVED: "Archived",
};
const PRIORITY_DOT: Record<string, string> = {
  LOW:    "bg-[var(--priority-low)]",
  MEDIUM: "bg-[var(--priority-medium)]",
  HIGH:   "bg-[var(--priority-high)]",
  URGENT: "bg-[var(--priority-urgent)]",
};
const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent",
};
const AVATAR_BG = [
  "bg-blue-500", "bg-purple-500", "bg-green-500",
  "bg-orange-500", "bg-pink-500", "bg-indigo-500",
];

function getInitials(name: string | null, fallback: string) {
  if (!name) return fallback.slice(0, 2).toUpperCase();
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function ProjectCard({
  project,
  isSelected,
  onSelect,
  canDelete,
  canUpdate,
  canArchive,
  onDelete,
  onArchive,
  onDuplicate,
  onEdit,
}: {
  project:     ProjectData;
  isSelected:  boolean;
  onSelect:    (checked: boolean) => void;
  canDelete:   boolean;
  canUpdate:   boolean;
  canArchive:  boolean;
  onDelete:    (id: string) => void;
  onArchive:   (id: string) => void;
  onDuplicate: (newProject: ProjectData) => void;
  onEdit:      (project: ProjectData) => void;
}) {
  const router = useRouter();
  const [deleting,    setDeleting]    = useState(false);
  const [archiving,   setArchiving]   = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const isArchived = project.status === "ARCHIVED";
  const progress   = project.taskCount > 0
    ? Math.round((project.doneCount / project.taskCount) * 100)
    : 0;
  const isOverdue = project.dueDate
    && new Date(project.dueDate) < new Date()
    && !isArchived;

  async function handleDelete() {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (res.ok) { onDelete(project.id); router.refresh(); }
    } catch { /* silent */ }
    finally { setDeleting(false); }
  }

  async function handleArchive() {
    setArchiving(true);
    try {
      const newStatus = isArchived ? "ACTIVE" : "ARCHIVED";
      const res = await fetch(`/api/projects/${project.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      });
      if (res.ok) { onArchive(project.id); router.refresh(); }
    } catch { /* silent */ }
    finally { setArchiving(false); }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const res  = await fetch(`/api/projects/${project.id}/duplicate`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        const d = json.data;
        onDuplicate({
          id:          d.id,
          name:        d.name,
          description: d.description ?? null,
          status:      d.status,
          priority:    d.priority,
          dueDate:     d.dueDate ? new Date(d.dueDate).toISOString() : null,
          createdAt:   new Date(d.createdAt).toISOString(),
          updatedAt:   new Date(d.updatedAt).toISOString(),
          taskCount:   0,
          doneCount:   0,
          members:     [],
        });
        router.refresh();
      }
    } catch { /* silent */ }
    finally { setDuplicating(false); }
  }

  const hasMenu = canUpdate || canArchive || canDelete;

  return (
    <Card
      className={cn(
        "group relative flex flex-col cursor-pointer transition-shadow hover:shadow-md",
        isSelected && "ring-2 ring-primary ring-offset-1"
      )}
    >
      <CardContent className="flex flex-1 flex-col p-4">
        {/* Top row: checkbox + menu */}
        <div className="mb-3 flex items-center justify-between">
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(e.target.checked)}
              className={cn(
                "size-4 accent-primary cursor-pointer transition-opacity",
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            />
          </div>

          {hasMenu && (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground",
                    "transition-opacity hover:bg-muted hover:text-foreground",
                    "opacity-0 group-hover:opacity-100"
                  )}>
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={4}
                    onClick={(e) => e.stopPropagation()}
                    className="z-50 min-w-44 rounded-md border border-border bg-card p-1 shadow-md"
                  >
                    {canUpdate && (
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted"
                        onSelect={() => onEdit(project)}
                      >
                        <Edit2 className="size-3.5" /> Edit
                      </DropdownMenu.Item>
                    )}
                    {canArchive && (
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted"
                        onSelect={handleArchive}
                        disabled={archiving}
                      >
                        {isArchived
                          ? <><ArchiveRestore className="size-3.5" /> Unarchive</>
                          : <><Archive className="size-3.5" /> Archive</>}
                      </DropdownMenu.Item>
                    )}
                    {canUpdate && (
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted"
                        onSelect={handleDuplicate}
                        disabled={duplicating}
                      >
                        <Copy className="size-3.5" />
                        {duplicating ? "Duplicating…" : "Duplicate"}
                      </DropdownMenu.Item>
                    )}
                    {canDelete && (
                      <>
                        <DropdownMenu.Separator className="my-1 h-px bg-border" />
                        <DropdownMenu.Item
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive outline-none hover:bg-destructive/10"
                          onSelect={handleDelete}
                          disabled={deleting}
                        >
                          <Trash2 className="size-3.5" />
                          {deleting ? "Deleting…" : "Delete"}
                        </DropdownMenu.Item>
                      </>
                    )}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          )}
        </div>

        {/* Clickable body */}
        <div className="flex flex-1 flex-col" onClick={() => router.push(`/projects/${project.id}`)}>
          {/* Priority dot + name */}
          <div className="mb-1.5 flex items-start gap-2">
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", PRIORITY_DOT[project.priority])} />
            <h3 className="text-sm font-semibold leading-snug text-foreground">{project.name}</h3>
          </div>

          {/* Description */}
          <p className="mb-3 line-clamp-2 pl-4 text-xs text-muted-foreground">
            {project.description || "No description."}
          </p>

          {/* Progress bar */}
          <div className="mb-3 pl-4">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3 text-green-500" />
                {project.doneCount}/{project.taskCount} done
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Status + priority badges */}
          <div className="mb-3 flex flex-wrap gap-1.5 pl-4">
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[project.status])}>
              {STATUS_LABEL[project.status] ?? project.status}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {PRIORITY_LABEL[project.priority] ?? project.priority}
            </span>
          </div>

          {/* Due date + member avatars */}
          <div className="mt-auto flex items-center justify-between pl-4">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className={cn("size-3", isOverdue && "text-destructive")} />
              {project.dueDate ? (
                <span className={cn(isOverdue && "text-destructive font-medium")}>
                  {new Date(project.dueDate).toLocaleDateString(undefined, {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </span>
              ) : (
                <span>No due date</span>
              )}
            </div>

            {project.members.length > 0 && (
              <div className="flex -space-x-1.5">
                {project.members.map((m, i) => (
                  <div
                    key={m.id}
                    title={m.name ?? m.id}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border-2 border-card",
                      "text-[9px] font-bold text-white",
                      AVATAR_BG[i % AVATAR_BG.length]
                    )}
                  >
                    {getInitials(m.name, m.id)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last updated */}
          <p className="mt-2 pl-4 text-xs text-muted-foreground">
            Updated {new Date(project.updatedAt).toLocaleDateString(undefined, {
              month: "short", day: "numeric",
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}