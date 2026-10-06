"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import {
  X, Plus, Trash2, Check, Clock, MessageSquare,
  CheckSquare, ListTodo, Activity, Info, Send,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton, SkeletonList } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { api, errorMessage } from "@/lib/api-client";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────
type FullTask = {
  id: string; title: string; description: string | null;
  status: string; priority: string; dueDate: string | null;
  assignee: { id: string; name: string | null } | null;
  creator:  { id: string; name: string | null } | null;
  labels:   Array<{ id: string; name: string; color: string }>;
  createdAt: string; updatedAt: string;
};
type SubTask       = { id: string; title: string; completed: boolean };
type ChecklistItem = { id: string; title: string; checked: boolean };
type Comment       = { id: string; content: string; createdAt: string; author: { id: string; name: string | null } };
type TimeEntry     = { id: string; minutes: number; note: string | null; createdAt: string; user: { id: string; name: string | null } };
type LogEntry      = { id: string; action: string; createdAt: string; user: { name: string | null; email: string } | null; metadata: unknown };
type Member        = { id: string; name: string | null; image: string | null };

/** What the signed-in member may do in this task, derived from the shared permission matrix. */
type Abilities = { edit: boolean; assign: boolean; comment: boolean; moderate: boolean };

const TABS = [
  { id: "details",   label: "Details",   icon: Info          },
  { id: "subtasks",  label: "Subtasks",  icon: ListTodo      },
  { id: "checklist", label: "Checklist", icon: CheckSquare   },
  { id: "comments",  label: "Comments",  icon: MessageSquare },
  { id: "time",      label: "Time",      icon: Clock         },
  { id: "activity",  label: "Activity",  icon: Activity      },
] as const;

type TabId = typeof TABS[number]["id"];

const PRIORITY_DOT: Record<string, string> = {
  LOW: "var(--priority-low)", MEDIUM: "var(--priority-medium)", HIGH: "var(--priority-high)", URGENT: "var(--priority-urgent)",
};
const LABEL_COLORS = [
  { hex: "#6366f1", name: "Indigo" }, { hex: "#10b981", name: "Green" }, { hex: "#f59e0b", name: "Amber" },
  { hex: "#ef4444", name: "Red" }, { hex: "#3b82f6", name: "Blue" }, { hex: "#8b5cf6", name: "Violet" },
  { hex: "#ec4899", name: "Pink" }, { hex: "#14b8a6", name: "Teal" },
];
const STATUS_OPTIONS   = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STATUS_LABEL: Record<string, string> = {
  BACKLOG: "Backlog", TODO: "To do", IN_PROGRESS: "In progress", REVIEW: "Review", DONE: "Done",
};
const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })
    + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function fmtMins(m: number) {
  const h = Math.floor(m / 60), rem = m % 60;
  return h > 0 ? `${h}h ${rem}m` : `${rem}m`;
}

// ─── Data helpers ──────────────────────────────────────────────────────────

const taskKey = (taskId: string, part?: string): QueryKey => (part ? ["task", taskId, part] : ["task", taskId]);

function useTaskPart<T>(taskId: string, part: string) {
  return useQuery({ queryKey: taskKey(taskId, part), queryFn: () => api.get<T[]>(`/api/tasks/${taskId}/${part}`) });
}

/**
 * Applies `change` to a cached list straight away, then runs the request.
 * If the request fails the list goes back to how it was and the user is told.
 */
function useOptimisticList<T>(key: QueryKey) {
  const queryClient = useQueryClient();
  return async (change: (items: T[]) => T[], request: () => Promise<unknown>) => {
    const previous = queryClient.getQueryData<T[]>(key);
    queryClient.setQueryData<T[]>(key, (items) => change(items ?? []));
    try {
      await request();
      return true;
    } catch (err) {
      queryClient.setQueryData(key, previous);
      toast.error(errorMessage(err));
      return false;
    }
  };
}

// ─── Main component ────────────────────────────────────────────────────────
export function TaskDetailModal({
  taskId, userRole, currentUserId, members, onClose, onTaskUpdated,
}: {
  taskId:        string | null;
  userRole:      string;
  currentUserId: string;
  members:       Member[];
  onClose:       () => void;
  onTaskUpdated?: () => void;
}) {
  const [tab, setTab] = useState<TabId>("details");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const role = userRole as Role;
  const can: Abilities = {
    edit: hasPermission(role, "task:update"),
    assign: hasPermission(role, "task:assign"),
    comment: hasPermission(role, "comment:create"),
    moderate: hasPermission(role, "comment:delete"),
  };

  const { data: task, isPending, isError, error } = useQuery({
    queryKey: taskKey(taskId ?? ""),
    queryFn: () => api.get<FullTask>(`/api/tasks/${taskId}`),
    enabled: Boolean(taskId),
  });

  /** Saves task fields. The cache updates first; the server's copy replaces it, or the old one comes back on failure. */
  async function patch(fields: Partial<FullTask>, body: Record<string, unknown> = fields) {
    if (!taskId) return;
    const key = taskKey(taskId);
    const previous = queryClient.getQueryData<FullTask>(key);
    queryClient.setQueryData<FullTask>(key, (t) => (t ? { ...t, ...fields } : t));
    setSaving(true);
    try {
      queryClient.setQueryData(key, await api.patch<FullTask>(`/api/tasks/${taskId}`, body));
      queryClient.invalidateQueries({ queryKey: taskKey(taskId, "activity") });
      onTaskUpdated?.();
    } catch (err) {
      queryClient.setQueryData(key, previous);
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!taskId) return null;

  return (
    <Dialog open={!!taskId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent hideClose className="flex max-h-[92vh] w-[calc(100%-1rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        {/* The visible title is an inline editor, so screen readers get this one */}
        <DialogTitle className="sr-only">{task?.title ?? "Task details"}</DialogTitle>
        {isError ? (
          <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
            <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          </div>
        ) : isPending ? (
          <div role="status" className="flex flex-col gap-4 p-6">
            <span className="sr-only">Loading task</span>
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-3 border-b border-border px-4 py-4 sm:px-6">
              <span
                aria-label={`${titleCase(task.priority)} priority`}
                className="mt-2 size-2 shrink-0 rounded-full"
                style={{ backgroundColor: PRIORITY_DOT[task.priority] }}
              />
              <TitleInput value={task.title} disabled={!can.edit} onCommit={(title) => void patch({ title })} />
              <button onClick={onClose} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Close task">
                <X className="size-4" />
              </button>
            </div>

            {/* Tab bar */}
            <div role="tablist" aria-label="Task sections" className="flex items-center overflow-x-auto border-b border-border px-2 sm:px-6">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors",
                    tab === id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon aria-hidden className="size-3.5" />
                  {label}
                </button>
              ))}
              <span aria-live="polite" className="ml-auto shrink-0 self-center pl-3 text-xs text-muted-foreground">
                {saving ? "Saving…" : ""}
              </span>
            </div>

            {/* Tab content */}
            <div role="tabpanel" className="flex-1 overflow-y-auto">
              {tab === "details"   && <DetailsTab task={task} members={members} patch={patch} can={can} />}
              {tab === "subtasks"  && <SubtasksTab taskId={taskId} can={can} />}
              {tab === "checklist" && <ChecklistTab taskId={taskId} can={can} />}
              {tab === "comments"  && <CommentsTab taskId={taskId} currentUserId={currentUserId} can={can} />}
              {tab === "time"      && <TimeTab taskId={taskId} currentUserId={currentUserId} can={can} />}
              {tab === "activity"  && <ActivityTab taskId={taskId} />}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Title input ───────────────────────────────────────────────────────────
function TitleInput({ value, disabled, onCommit }: { value: string; disabled: boolean; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value);
  const [syncedFrom, setSyncedFrom] = useState(value);
  if (syncedFrom !== value) { setSyncedFrom(value); setV(value); }

  function commit() {
    const next = v.trim();
    if (!next) setV(value);
    else if (next !== value) onCommit(next);
  }

  return (
    <input
      aria-label="Task title"
      className="min-w-0 flex-1 rounded bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
      value={v}
      maxLength={200}
      disabled={disabled}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") { setV(value); }
      }}
    />
  );
}

// ─── Details tab ────────────────────────────────────────────────────────────
function DetailsTab({ task, members, patch, can }: {
  task: FullTask;
  members: Member[];
  patch: (fields: Partial<FullTask>, body?: Record<string, unknown>) => Promise<void>;
  can: Abilities;
}) {
  const queryClient = useQueryClient();
  const [desc, setDesc] = useState(task.description ?? "");
  const [newLabel, setNewLabel] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].hex);
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [addingLabel, setAddingLabel] = useState(false);

  const [descSyncedFrom, setDescSyncedFrom] = useState(task.description);
  if (descSyncedFrom !== task.description) {
    setDescSyncedFrom(task.description);
    setDesc(task.description ?? "");
  }

  const setLabels = (labels: FullTask["labels"]) =>
    queryClient.setQueryData<FullTask>(taskKey(task.id), (t) => (t ? { ...t, labels } : t));

  async function addLabel() {
    if (!newLabel.trim()) return;
    setAddingLabel(true);
    try {
      const label = await api.post<FullTask["labels"][number]>(`/api/tasks/${task.id}/labels`, { name: newLabel.trim(), color: newLabelColor });
      setLabels([...task.labels, label]);
      setNewLabel("");
      setShowLabelForm(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAddingLabel(false);
    }
  }

  async function removeLabel(labelId: string) {
    const previous = task.labels;
    setLabels(previous.filter((l) => l.id !== labelId));
    try {
      await api.delete(`/api/tasks/${task.id}/labels/${labelId}`);
    } catch (err) {
      setLabels(previous);
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="grid md:grid-cols-[1fr_260px] md:divide-x md:divide-border">
      {/* Left: description and labels */}
      <div className="p-4 sm:p-6">
        <Label htmlFor="task-description" className="mb-2 block text-xs text-muted-foreground">Description</Label>
        <Textarea
          id="task-description"
          className="min-h-32 resize-y text-sm"
          placeholder={can.edit ? "Add a description…" : "No description."}
          value={desc}
          maxLength={5000}
          disabled={!can.edit}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => { if (desc !== (task.description ?? "")) void patch({ description: desc || null }); }}
        />

        <div className="mt-6">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Labels</p>
          <ul className="flex flex-wrap gap-1.5">
            {task.labels.map((l) => (
              <li
                key={l.id}
                style={{ backgroundColor: l.color + "22", color: l.color, borderColor: l.color + "44" }}
                className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
              >
                {l.name}
                {can.edit && (
                  <button onClick={() => void removeLabel(l.id)} aria-label={`Remove label ${l.name}`} className="rounded-full opacity-60 hover:opacity-100">
                    <X className="size-3" />
                  </button>
                )}
              </li>
            ))}
            {task.labels.length === 0 && !can.edit && <li className="text-xs text-muted-foreground">No labels.</li>}
            {can.edit && (
              <li>
                <button
                  onClick={() => setShowLabelForm((v) => !v)}
                  aria-expanded={showLabelForm}
                  className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-3" /> Add label
                </button>
              </li>
            )}
          </ul>

          {showLabelForm && (
            <form
              className="mt-3 flex flex-wrap items-center gap-2"
              onSubmit={(e) => { e.preventDefault(); void addLabel(); }}
            >
              <Input
                aria-label="Label name"
                className="h-8 w-40 text-xs"
                placeholder="Label name"
                maxLength={40}
                autoFocus
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
              <div role="radiogroup" aria-label="Label colour" className="flex gap-1.5">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    role="radio"
                    aria-checked={newLabelColor === c.hex}
                    aria-label={c.name}
                    onClick={() => setNewLabelColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={cn("size-5 rounded-full transition-transform", newLabelColor === c.hex && "scale-110 ring-2 ring-ring ring-offset-2 ring-offset-card")}
                  />
                ))}
              </div>
              <Button type="submit" size="sm" className="h-8 text-xs" disabled={!newLabel.trim() || addingLabel}>
                {addingLabel ? "Adding…" : "Add"}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Right: fields */}
      <div className="flex flex-col gap-4 border-t border-border p-4 sm:p-6 md:border-t-0">
        <div>
          <Label htmlFor="task-status" className="mb-1.5 block text-xs text-muted-foreground">Status</Label>
          <Select value={task.status} disabled={!can.edit} onValueChange={(status) => void patch({ status })}>
            <SelectTrigger id="task-status" className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="task-priority" className="mb-1.5 block text-xs text-muted-foreground">Priority</Label>
          <Select value={task.priority} disabled={!can.edit} onValueChange={(priority) => void patch({ priority })}>
            <SelectTrigger id="task-priority" className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{titleCase(p)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="task-assignee" className="mb-1.5 block text-xs text-muted-foreground">Assignee</Label>
          {can.assign ? (
            <Select
              value={task.assignee?.id ?? "unassigned"}
              onValueChange={(v) => {
                const m = members.find((m) => m.id === v);
                void patch(
                  { assignee: v === "unassigned" ? null : { id: v, name: m?.name ?? null } },
                  { assigneeId: v === "unassigned" ? null : v }
                );
              }}
            >
              <SelectTrigger id="task-assignee" className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name ?? "Unnamed member"}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <p id="task-assignee" className="flex h-8 items-center rounded-md border border-border bg-muted/40 px-2.5 text-xs text-muted-foreground">
              {task.assignee?.name ?? "Unassigned"}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="task-due" className="mb-1.5 block text-xs text-muted-foreground">Due date</Label>
          <Input
            id="task-due"
            type="date"
            className="h-8 text-xs"
            disabled={!can.edit}
            value={task.dueDate ? task.dueDate.split("T")[0] : ""}
            onChange={(e) => {
              const dueDate = e.target.value ? new Date(e.target.value + "T00:00:00.000Z").toISOString() : null;
              void patch({ dueDate });
            }}
          />
        </div>

        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4 text-xs text-muted-foreground">
          {task.creator && <p>Created by <span className="font-medium text-foreground">{task.creator.name ?? "a former member"}</span></p>}
          <p>{fmt(task.createdAt)}</p>
          {task.updatedAt !== task.createdAt && <p>Last updated {fmt(task.updatedAt)}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Subtasks and checklist ─────────────────────────────────────────────────

/** Subtasks and checklist items behave the same; only the field name differs. */
function ToggleList<T extends { id: string; title: string }>({
  taskId, part, doneField, noun, can,
}: {
  taskId: string;
  part: "subtasks" | "checklist";
  doneField: "completed" | "checked";
  noun: string;
  can: Abilities;
}) {
  const key = taskKey(taskId, part);
  const { data: items, isPending, isError, refetch } = useTaskPart<T>(taskId, part);
  const queryClient = useQueryClient();
  const optimistic = useOptimisticList<T>(key);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const isDone = (item: T) => Boolean((item as Record<string, unknown>)[doneField]);

  function toggle(item: T) {
    const next = !isDone(item);
    void optimistic(
      (list) => list.map((i) => (i.id === item.id ? { ...i, [doneField]: next } : i)),
      () => api.patch(`/api/tasks/${taskId}/${part}/${item.id}`, { [doneField]: next })
    );
  }

  function remove(item: T) {
    void optimistic(
      (list) => list.filter((i) => i.id !== item.id),
      () => api.delete(`/api/tasks/${taskId}/${part}/${item.id}`)
    );
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const item = await api.post<T>(`/api/tasks/${taskId}/${part}`, { title: newTitle.trim() });
      queryClient.setQueryData<T[]>(key, (list) => [...(list ?? []), item]);
      setNewTitle("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  if (isPending) return <div className="p-6"><SkeletonList rows={3} /></div>;
  if (isError) return <div className="p-6"><ErrorState message={`The ${noun} list didn't load.`} onRetry={() => void refetch()} /></div>;

  const done = items.filter(isDone).length;
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground capitalize">{part === "subtasks" ? "Subtasks" : "Checklist"}</span>
          <span className="text-xs tabular-nums text-muted-foreground">{done}/{items.length} done</span>
        </div>
        {items.length > 0 && (
          <div role="progressbar" aria-label={`${pct}% done`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {can.edit ? `No ${noun}s yet. Add the first one below.` : `No ${noun}s.`}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 rounded-md border border-border p-2">
              <button
                role="checkbox"
                aria-checked={isDone(item)}
                aria-label={item.title}
                disabled={!can.edit}
                onClick={() => toggle(item)}
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded border disabled:cursor-default",
                  isDone(item) ? "border-primary bg-primary text-primary-foreground" : "border-border"
                )}
              >
                {isDone(item) && <Check className="size-3" />}
              </button>
              <span className={cn("flex-1 text-sm", isDone(item) && "text-muted-foreground line-through")}>{item.title}</span>
              {can.edit && (
                <button onClick={() => remove(item)} aria-label={`Delete "${item.title}"`} className="rounded p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {can.edit && (
        <form onSubmit={add} className="mt-3 flex gap-2">
          <Input
            aria-label={`New ${noun}`}
            className="h-8 text-sm"
            placeholder={`Add ${noun}…`}
            maxLength={200}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Button type="submit" size="sm" className="h-8" disabled={!newTitle.trim() || adding}>Add</Button>
        </form>
      )}
    </div>
  );
}

function SubtasksTab({ taskId, can }: { taskId: string; can: Abilities }) {
  return <ToggleList<SubTask> taskId={taskId} part="subtasks" doneField="completed" noun="subtask" can={can} />;
}

function ChecklistTab({ taskId, can }: { taskId: string; can: Abilities }) {
  return <ToggleList<ChecklistItem> taskId={taskId} part="checklist" doneField="checked" noun="item" can={can} />;
}

// ─── Comments tab ───────────────────────────────────────────────────────────
function CommentsTab({ taskId, currentUserId, can }: { taskId: string; currentUserId: string; can: Abilities }) {
  const key = taskKey(taskId, "comments");
  const { data: items, isPending, isError, refetch } = useTaskPart<Comment>(taskId, "comments");
  const queryClient = useQueryClient();
  const optimistic = useOptimisticList<Comment>(key);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const comment = await api.post<Comment>(`/api/tasks/${taskId}/comments`, { content: draft.trim() });
      queryClient.setQueryData<Comment[]>(key, (list) => [...(list ?? []), comment]);
      setDraft("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  function remove(id: string) {
    void optimistic((list) => list.filter((c) => c.id !== id), () => api.delete(`/api/tasks/${taskId}/comments/${id}`));
  }

  if (isPending) return <div className="p-6"><SkeletonList rows={3} /></div>;
  if (isError) return <div className="p-6"><ErrorState message="Comments didn't load." onRetry={() => void refetch()} /></div>;

  return (
    <div className="flex h-[420px] flex-col">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        <ul>
          {items.map((c) => {
            const initials = (c.author.name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
            const canDelete = can.moderate || c.author.id === currentUserId;
            return (
              <li key={c.id} className="mb-4 flex gap-3">
                <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xs font-medium text-foreground">{c.author.name ?? "Former member"}</span>
                    <time dateTime={c.createdAt} className="text-xs text-muted-foreground">{fmt(c.createdAt)}</time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">{c.content}</p>
                </div>
                {canDelete && (
                  <button onClick={() => remove(c.id)} aria-label="Delete comment" className="self-start rounded p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <div ref={bottomRef} />
      </div>

      {can.comment ? (
        <form className="border-t border-border p-4" onSubmit={(e) => { e.preventDefault(); void send(); }}>
          <div className="flex gap-2">
            <Textarea
              aria-label="Write a comment"
              className="min-h-0 resize-none text-sm"
              rows={2}
              maxLength={5000}
              placeholder="Write a comment…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send(); }}
            />
            <Button type="submit" size="sm" disabled={!draft.trim() || sending} className="self-end" aria-label="Send comment">
              <Send className="size-3.5" />
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Ctrl+Enter to send</p>
        </form>
      ) : (
        <p className="border-t border-border p-4 text-xs text-muted-foreground">Your role can read comments but not add them.</p>
      )}
    </div>
  );
}

// ─── Time tab ───────────────────────────────────────────────────────────────
function TimeTab({ taskId, currentUserId, can }: { taskId: string; currentUserId: string; can: Abilities }) {
  const key = taskKey(taskId, "time");
  const { data: items, isPending, isError, refetch } = useTaskPart<TimeEntry>(taskId, "time");
  const queryClient = useQueryClient();
  const optimistic = useOptimisticList<TimeEntry>(key);
  const [mins, setMins] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function log(e: React.FormEvent) {
    e.preventDefault();
    const minutes = parseInt(mins, 10);
    if (!minutes || minutes < 1) return;
    setSaving(true);
    try {
      const entry = await api.post<TimeEntry>(`/api/tasks/${taskId}/time`, { minutes, note: note.trim() || null });
      queryClient.setQueryData<TimeEntry[]>(key, (list) => [entry, ...(list ?? [])]);
      setMins("");
      setNote("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function remove(id: string) {
    void optimistic((list) => list.filter((e) => e.id !== id), () => api.delete(`/api/tasks/${taskId}/time/${id}`));
  }

  if (isPending) return <div className="p-6"><SkeletonList rows={3} /></div>;
  if (isError) return <div className="p-6"><ErrorState message="Time entries didn't load." onRetry={() => void refetch()} /></div>;

  const totalMins = items.reduce((sum, e) => sum + e.minutes, 0);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 rounded-lg bg-accent px-4 py-3">
        <p className="text-xs text-muted-foreground">Total time logged</p>
        <p className="text-2xl font-semibold tabular-nums text-foreground">{fmtMins(totalMins)}</p>
      </div>

      {can.edit && (
        <form onSubmit={log} className="mb-4 flex flex-wrap gap-2">
          <Input
            aria-label="Minutes"
            className="h-8 w-28 text-sm"
            type="number"
            min={1}
            max={1440}
            placeholder="Minutes"
            value={mins}
            onChange={(e) => setMins(e.target.value)}
          />
          <Input
            aria-label="Note"
            className="h-8 min-w-40 flex-1 text-sm"
            placeholder="What did you work on? (optional)"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button type="submit" size="sm" className="h-8" disabled={!mins || saving}>Log time</Button>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No time logged yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium tabular-nums text-foreground">{fmtMins(e.minutes)}</p>
                {e.note && <p className="mt-0.5 break-words text-xs text-muted-foreground">{e.note}</p>}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {e.user.name ?? "Former member"} · {fmt(e.createdAt)}
                </p>
              </div>
              {(can.moderate || e.user.id === currentUserId) && (
                <button onClick={() => remove(e.id)} aria-label="Delete time entry" className="rounded p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Activity tab ───────────────────────────────────────────────────────────

/** Turns an audit entry's changed fields into a short sentence. */
function describe(entry: LogEntry): string {
  if (entry.action === "CREATED") return "created this task";
  if (entry.action === "DELETED") return "deleted this task";
  if (entry.action !== "UPDATED" || !entry.metadata || typeof entry.metadata !== "object") return `${entry.action.toLowerCase()} this task`;

  const m = entry.metadata as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof m.status === "string") parts.push(`moved it to ${STATUS_LABEL[m.status] ?? m.status}`);
  if (typeof m.priority === "string") parts.push(`set priority to ${titleCase(m.priority)}`);
  if ("assigneeId" in m) parts.push(m.assigneeId ? "reassigned it" : "unassigned it");
  if ("dueDate" in m) parts.push(m.dueDate ? "changed the due date" : "removed the due date");
  if (typeof m.title === "string") parts.push("renamed it");
  if ("description" in m) parts.push("edited the description");
  return parts.length ? parts.join(", ") : "updated this task";
}

function ActivityTab({ taskId }: { taskId: string }) {
  const { data: items, isPending, isError, refetch } = useTaskPart<LogEntry>(taskId, "activity");

  if (isPending) return <div className="p-6"><SkeletonList rows={3} /></div>;
  if (isError) return <div className="p-6"><ErrorState message="Activity didn't load." onRetry={() => void refetch()} /></div>;

  return (
    <div className="p-4 sm:p-6">
      {items.length === 0 && <p className="text-sm text-muted-foreground">No activity recorded.</p>}
      <ol className="flex flex-col gap-4">
        {items.map((l) => (
          <li key={l.id} className="flex items-start gap-3">
            <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
            <div>
              <p className="text-sm text-foreground">
                <span className="font-medium">{l.user?.name ?? l.user?.email ?? "Someone"}</span> {describe(l)}
              </p>
              <time dateTime={l.createdAt} className="text-xs text-muted-foreground">{fmt(l.createdAt)}</time>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
