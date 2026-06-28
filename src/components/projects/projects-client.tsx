// PASTE LOCATION: src/components/projects/projects-client.tsx (create new file)
"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProjectCard, type ProjectData } from "./project-card";
import { CreateProjectDialog } from "./create-project-dialog";
import { EditProjectDialog } from "./edit-project-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FolderKanban, Search, Trash2, Archive, X } from "lucide-react";

const PAGE_SIZE = 12;

export function ProjectsClient({
  projects: initial,
  canCreate,
  canDelete,
  canUpdate,
  canArchive,
}: {
  projects:   ProjectData[];
  canCreate:  boolean;
  canDelete:  boolean;
  canUpdate:  boolean;
  canArchive: boolean;
}) {
  const router = useRouter();

  const [projects,     setProjects]     = useState<ProjectData[]>(initial);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [prioFilter,   setPrioFilter]   = useState("ALL");
  const [sort,         setSort]         = useState("NEWEST");
  const [page,         setPage]         = useState(1);
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [editProject,  setEditProject]  = useState<ProjectData | null>(null);
  const [bulkLoading,  setBulkLoading]  = useState(false);

  // ── Filter + sort ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = projects;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "ALL") list = list.filter((p) => p.status === statusFilter);
    if (prioFilter   !== "ALL") list = list.filter((p) => p.priority === prioFilter);

    const out = [...list];
    switch (sort) {
      case "OLDEST":
        out.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "DUE_DATE":
        out.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;
      case "ALPHABETICAL":
        out.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "MOST_ACTIVE":
        out.sort((a, b) => b.taskCount - a.taskCount);
        break;
      default: // NEWEST
        out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return out;
  }, [projects, search, statusFilter, prioFilter, sort]);

  const totalPages     = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage       = Math.min(page, totalPages);
  const paginated      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilters     = !!(search || statusFilter !== "ALL" || prioFilter !== "ALL");
  const allPageSelected = paginated.length > 0 && paginated.every((p) => selected.has(p.id));

  function resetFilters() {
    setSearch(""); setStatusFilter("ALL"); setPrioFilter("ALL"); setPage(1);
  }

  // ── Selection ────────────────────────────────────────────────────────────
  function toggleSelect(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function clearSelection() { setSelected(new Set()); }

  // ── Optimistic handlers ──────────────────────────────────────────────────
  const handleCreated = useCallback((p: ProjectData) => {
    setProjects((prev) => [p, ...prev]);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }, []);

  const handleArchive = useCallback((id: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: p.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED" } : p
      )
    );
  }, []);

  const handleDuplicate = useCallback((newProject: ProjectData) => {
    setProjects((prev) => [newProject, ...prev]);
  }, []);

  const handleUpdated = useCallback((updated: Partial<ProjectData> & { id: string }) => {
    setProjects((prev) => prev.map((p) => p.id === updated.id ? { ...p, ...updated } : p));
  }, []);

  // ── Bulk actions ─────────────────────────────────────────────────────────
  async function bulkDelete() {
    if (!confirm(
      `Delete ${selected.size} project${selected.size > 1 ? "s" : ""}? This cannot be undone.`
    )) return;
    setBulkLoading(true);
    try {
      await Promise.all([...selected].map((id) =>
        fetch(`/api/projects/${id}`, { method: "DELETE" })
      ));
      setProjects((prev) => prev.filter((p) => !selected.has(p.id)));
      clearSelection();
      router.refresh();
    } catch { /* silent */ }
    finally { setBulkLoading(false); }
  }

  async function bulkArchive() {
    setBulkLoading(true);
    try {
      await Promise.all([...selected].map((id) =>
        fetch(`/api/projects/${id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ status: "ARCHIVED" }),
        })
      ));
      setProjects((prev) =>
        prev.map((p) => selected.has(p.id) ? { ...p, status: "ARCHIVED" } : p)
      );
      clearSelection();
      router.refresh();
    } catch { /* silent */ }
    finally { setBulkLoading(false); }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length === 0
              ? "Create your first project to get started."
              : `${filtered.length}${filtered.length !== projects.length ? ` of ${projects.length}` : ""} ${projects.length === 1 ? "project" : "projects"}`}
          </p>
        </div>
        {canCreate && <CreateProjectDialog onCreated={handleCreated} />}
      </div>

      {/* Controls — only show when there are projects */}
      {projects.length > 0 && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-48 flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or description…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ON_HOLD">On hold</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={prioFilter} onValueChange={(v) => { setPrioFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All priorities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NEWEST">Newest</SelectItem>
                <SelectItem value="OLDEST">Oldest</SelectItem>
                <SelectItem value="DUE_DATE">Due date</SelectItem>
                <SelectItem value="ALPHABETICAL">Alphabetical</SelectItem>
                <SelectItem value="MOST_ACTIVE">Most active</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="icon" title="Clear filters" onClick={resetFilters}>
                <X className="size-4" />
              </Button>
            )}
          </div>

          {/* Bulk actions bar */}
          {selected.size > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5">
              <span className="text-sm font-medium text-foreground">
                {selected.size} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="mr-1 size-3.5" /> Clear
                </Button>
                {canArchive && (
                  <Button variant="outline" size="sm" disabled={bulkLoading} onClick={bulkArchive}>
                    <Archive className="mr-1 size-3.5" /> Archive
                  </Button>
                )}
                {canDelete && (
                  <Button variant="destructive" size="sm" disabled={bulkLoading} onClick={bulkDelete}>
                    <Trash2 className="mr-1 size-3.5" /> Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Content */}
      {projects.length === 0 ? (
        <EmptyState canCreate={canCreate} onCreated={handleCreated} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-foreground">No projects match your filters</p>
          <Button variant="ghost" size="sm" onClick={resetFilters}>Clear filters</Button>
        </div>
      ) : (
        <>
          {/* Select-all row */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4 cursor-pointer accent-primary"
              checked={allPageSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelected(new Set(paginated.map((p) => p.id)));
                } else {
                  clearSelection();
                }
              }}
            />
            <span className="text-xs text-muted-foreground">
              Select all on this page ({paginated.length})
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isSelected={selected.has(project.id)}
                onSelect={(checked) => toggleSelect(project.id, checked)}
                canDelete={canDelete}
                canUpdate={canUpdate}
                canArchive={canArchive}
                onDelete={handleDelete}
                onArchive={handleArchive}
                onDuplicate={handleDuplicate}
                onEdit={(p) => setEditProject(p)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm"
                disabled={safePage === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {safePage} of {totalPages}
              </span>
              <Button variant="outline" size="sm"
                disabled={safePage === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Edit dialog */}
      {editProject && (
        <EditProjectDialog
          project={editProject}
          open
          onClose={() => setEditProject(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}

function EmptyState({
  canCreate,
  onCreated,
}: {
  canCreate: boolean;
  onCreated: (p: ProjectData) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
        <FolderKanban className="size-8 text-accent-foreground" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">No projects yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {canCreate
            ? "Get your team organized by creating your first project."
            : "No projects have been created for your organization yet."}
        </p>
      </div>
      {canCreate && <CreateProjectDialog onCreated={onCreated} />}
    </div>
  );
}