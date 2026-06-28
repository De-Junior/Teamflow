// PASTE LOCATION: src/components/tasks/task-filter-bar.tsx (create new file)
"use client";

import { Input }  from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import type { Member } from "@/components/projects/project-view";

type Filters = { search: string; assigneeId: string; priority: string; status: string };

export function TaskFilterBar({ filters, onFiltersChange, members }: {
  filters:          Filters;
  onFiltersChange:  (f: Filters) => void;
  members:          Member[];
}) {
  const set = (key: keyof Filters, value: string) => onFiltersChange({ ...filters, [key]: value });
  const hasActive = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search tasks…" value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="h-8 w-44 pl-8 text-xs"
        />
      </div>

      <Select value={filters.status || "all"} onValueChange={(v) => set("status", v === "all" ? "" : v)}>
        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="BACKLOG">Backlog</SelectItem>
          <SelectItem value="TODO">To do</SelectItem>
          <SelectItem value="IN_PROGRESS">In progress</SelectItem>
          <SelectItem value="REVIEW">Review</SelectItem>
          <SelectItem value="DONE">Done</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.priority || "all"} onValueChange={(v) => set("priority", v === "all" ? "" : v)}>
        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          <SelectItem value="LOW">Low</SelectItem>
          <SelectItem value="MEDIUM">Medium</SelectItem>
          <SelectItem value="HIGH">High</SelectItem>
          <SelectItem value="URGENT">Urgent</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.assigneeId || "all"} onValueChange={(v) => set("assigneeId", v === "all" ? "" : v)}>
        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Assignee" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All assignees</SelectItem>
          {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name ?? m.id}</SelectItem>)}
        </SelectContent>
      </Select>

      {hasActive && (
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground"
          onClick={() => onFiltersChange({ search: "", assigneeId: "", priority: "", status: "" })}>
          <X className="size-3" /> Clear
        </Button>
      )}
    </div>
  );
}