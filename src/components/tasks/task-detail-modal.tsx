/* eslint-disable react-hooks/refs */
/* eslint-disable react-hooks/set-state-in-effect */
// PASTE LOCATION: src/components/tasks/task-detail-modal.tsx (create new file)
"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent }        from "@/components/ui/dialog";
import { Button }                       from "@/components/ui/button";
import { Input }                        from "@/components/ui/input";
import { Textarea }                     from "@/components/ui/textarea";
import { Label }                        from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn }                           from "@/lib/utils";
import { hasPermission }                from "@/lib/auth/permissions";
import type { Role }                    from "@prisma/client";
import {
  X, Plus, Trash2, Check, Clock, MessageSquare,
  CheckSquare, ListTodo, Activity, Info, Send,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
type FullTask = {
  id: string; title: string; description: string | null;
  status: string; priority: string; dueDate: string | null;
  assignee: { id: string; name: string | null } | null;
  creator:  { id: string; name: string | null } | null;
  labels:   Array<{ id: string; name: string; color: string }>;
  createdAt: string; updatedAt: string;
};
type SubTask      = { id: string; title: string; completed: boolean };
type ChecklistItem = { id: string; title: string; checked: boolean };
type Comment      = { id: string; content: string; createdAt: string; author: { id: string; name: string | null } };
type TimeEntry    = { id: string; minutes: number; note: string | null; createdAt: string; user: { id: string; name: string | null } };
type LogEntry     = { id: string; action: string; createdAt: string; user: { name: string | null; email: string }; metadata: unknown };
type Member       = { id: string; name: string | null; image: string | null };

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
  LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#f97316", URGENT: "#ef4444",
};
const LABEL_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];
const STATUS_OPTIONS  = ["BACKLOG","TODO","IN_PROGRESS","REVIEW","DONE"];
const PRIORITY_OPTIONS = ["LOW","MEDIUM","HIGH","URGENT"];
const STATUS_LABEL: Record<string,string> = {
  BACKLOG:"Backlog", TODO:"To do", IN_PROGRESS:"In progress", REVIEW:"Review", DONE:"Done",
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined,{ month:"short", day:"numeric", year:"numeric" })
    + " " + d.toLocaleTimeString(undefined,{ hour:"2-digit", minute:"2-digit" });
}
function fmtMins(m: number) {
  const h = Math.floor(m/60), rem = m%60;
  return h > 0 ? `${h}h ${rem}m` : `${rem}m`;
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
  const [tab,        setTab]        = useState<TabId>("details");
  const [task,       setTask]       = useState<FullTask | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [subtasks,   setSubtasks]   = useState<SubTask[] | null>(null);
  const [checklist,  setChecklist]  = useState<ChecklistItem[] | null>(null);
  const [comments,   setComments]   = useState<Comment[] | null>(null);
  const [timeEntries,setTimeEntries]= useState<TimeEntry[] | null>(null);
  const [activity,   setActivity]   = useState<LogEntry[] | null>(null);
  const [saving,     setSaving]     = useState(false);

  // Fetch core task when modal opens
  useEffect(() => {
    if (!taskId) { setTask(null); setTab("details"); return; }
    setLoading(true);
    setSubtasks(null); setChecklist(null); setComments(null);
    setTimeEntries(null); setActivity(null);
    fetch(`/api/tasks/${taskId}`)
      .then(r => r.json())
      .then(j => { if (j.success) setTask(j.data); })
      .finally(() => setLoading(false));
  }, [taskId]);

  // Lazy-load tab data
  useEffect(() => {
    if (!taskId) return;
    if (tab === "subtasks"  && subtasks   === null) fetch(`/api/tasks/${taskId}/subtasks`).then(r=>r.json()).then(j=>j.success&&setSubtasks(j.data));
    if (tab === "checklist" && checklist  === null) fetch(`/api/tasks/${taskId}/checklist`).then(r=>r.json()).then(j=>j.success&&setChecklist(j.data));
    if (tab === "comments"  && comments   === null) fetch(`/api/tasks/${taskId}/comments`).then(r=>r.json()).then(j=>j.success&&setComments(j.data));
    if (tab === "time"      && timeEntries=== null) fetch(`/api/tasks/${taskId}/time`).then(r=>r.json()).then(j=>j.success&&setTimeEntries(j.data));
    if (tab === "activity"  && activity   === null) fetch(`/api/tasks/${taskId}/activity`).then(r=>r.json()).then(j=>j.success&&setActivity(j.data));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, taskId]);

  async function patch(data: Record<string, unknown>) {
    if (!taskId) return;
    setSaving(true);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      onTaskUpdated?.();
    } finally { setSaving(false); }
  }

  function updateLocalTask(fields: Partial<FullTask>) {
    setTask(prev => prev ? { ...prev, ...fields } : null);
  }

  if (!taskId) return null;

  return (
    <Dialog open={!!taskId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0">
        {loading || !task ? (
          <div className="flex items-center justify-center p-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-3 border-b border-border px-6 py-4">
              <span className="mt-2 size-2 shrink-0 rounded-full" style={{ backgroundColor: PRIORITY_DOT[task.priority] }} />
              <TitleInput
                value={task.title}
                onBlur={(v) => { updateLocalTask({ title: v }); void patch({ title: v }); }}
              />
              <button onClick={onClose} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-border px-6">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors",
                    tab === id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
              {saving && <span className="ml-auto self-center text-xs text-muted-foreground">Saving…</span>}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {tab === "details"   && <DetailsTab task={task} members={members} updateLocal={updateLocalTask} patch={patch} userRole={userRole} />}
              {tab === "subtasks"  && <SubtasksTab taskId={taskId} items={subtasks}  setItems={setSubtasks}  userRole={userRole} />}
              {tab === "checklist" && <ChecklistTab taskId={taskId} items={checklist} setItems={setChecklist} userRole={userRole} />}
              {tab === "comments"  && <CommentsTab taskId={taskId} items={comments}  setItems={setComments}  currentUserId={currentUserId} userRole={userRole} />}
              {tab === "time"      && <TimeTab taskId={taskId} items={timeEntries}   setItems={setTimeEntries} currentUserId={currentUserId} userRole={userRole} />}
              {tab === "activity"  && <ActivityTab items={activity} />}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Title input ───────────────────────────────────────────────────────────
function TitleInput({ value, onBlur }: { value: string; onBlur: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  return (
    <input
      className="flex-1 bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v.trim() && v !== value) onBlur(v.trim()); }}
    />
  );
}

// ─── Details tab ────────────────────────────────────────────────────────────
function DetailsTab({ task, members, updateLocal, patch, userRole }: {
  task: FullTask;
  members: Member[];
  updateLocal: (f: Partial<FullTask>) => void;
  patch: (d: Record<string, unknown>) => void;
  userRole: string;
}) {
  const [desc, setDesc] = useState(task.description ?? "");
  const [newLabel, setNewLabel] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [showLabelForm, setShowLabelForm] = useState(false);

  // Only Owners/Managers (and Super Admin) can (re)assign a task —
  // mirrors the "task:assign" permission in src/lib/auth/permissions.ts
  const canAssign = hasPermission(userRole as Role, "task:assign");

  useEffect(() => { setDesc(task.description ?? ""); }, [task.description]);

  async function addLabel() {
    if (!newLabel.trim()) return;
    const res = await fetch(`/api/tasks/${task.id}/labels`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newLabel.trim(), color: newLabelColor }),
    });
    const j = await res.json();
    if (j.success) {
      updateLocal({ labels: [...task.labels, j.data] });
      setNewLabel(""); setShowLabelForm(false);
    }
  }

  async function removeLabel(labelId: string) {
    await fetch(`/api/tasks/${task.id}/labels/${labelId}`, { method: "DELETE" });
    updateLocal({ labels: task.labels.filter(l => l.id !== labelId) });
  }

  return (
    <div className="grid grid-cols-[1fr_260px] divide-x divide-border">
      {/* Left: description */}
      <div className="p-6">
        <Label className="mb-2 block text-xs text-muted-foreground">Description</Label>
        <Textarea
          className="min-h-32 resize-y text-sm"
          placeholder="Add a description…"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => { if (desc !== (task.description ?? "")) void patch({ description: desc || null }); }}
        />

        {/* Labels */}
        <div className="mt-6">
          <Label className="mb-2 block text-xs text-muted-foreground">Labels</Label>
          <div className="flex flex-wrap gap-1.5">
            {task.labels.map((l) => (
              <span
                key={l.id}
                style={{ backgroundColor: l.color + "22", color: l.color, borderColor: l.color + "44" }}
                className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
              >
                {l.name}
                <button onClick={() => void removeLabel(l.id)} className="opacity-60 hover:opacity-100">
                  <X className="size-2.5" />
                </button>
              </span>
            ))}
            <button
              onClick={() => setShowLabelForm((v) => !v)}
              className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-2.5" /> Add
            </button>
          </div>

          {showLabelForm && (
            <div className="mt-2 flex items-center gap-2">
              <Input
                className="h-7 text-xs"
                placeholder="Label name"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void addLabel(); }}
              />
              <div className="flex gap-1">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c} onClick={() => setNewLabelColor(c)}
                    style={{ backgroundColor: c }}
                    className={cn("size-4 rounded-full transition-transform", newLabelColor === c && "scale-125 ring-1 ring-offset-1")}
                  />
                ))}
              </div>
              <Button size="sm" className="h-7 text-xs" onClick={void addLabel}>Add</Button>
            </div>
          )}
        </div>
      </div>

      {/* Right: metadata */}
      <div className="flex flex-col gap-4 p-6">
        {/* Status */}
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Status</Label>
          <Select value={task.status} onValueChange={(v) => { updateLocal({ status: v }); void patch({ status: v }); }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Priority</Label>
          <Select value={task.priority} onValueChange={(v) => { updateLocal({ priority: v }); void patch({ priority: v }); }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p.charAt(0)+p.slice(1).toLowerCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Assignee — editable only for roles with task:assign permission */}
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Assignee</Label>
          {canAssign ? (
            <Select
              value={task.assignee?.id ?? "unassigned"}
              onValueChange={(v) => {
                const m = members.find(m => m.id === v);
                updateLocal({ assignee: v === "unassigned" ? null : { id: v, name: m?.name ?? null } });
                void patch({ assigneeId: v === "unassigned" ? null : v });
              }}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name ?? m.id}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex h-8 items-center rounded-md border border-border bg-muted/40 px-2.5 text-xs text-muted-foreground">
              {task.assignee?.name ?? "Unassigned"}
            </div>
          )}
        </div>

        {/* Due date */}
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Due date</Label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={task.dueDate ? task.dueDate.split("T")[0] : ""}
            onChange={(e) => {
              const iso = e.target.value ? new Date(e.target.value + "T00:00:00.000Z").toISOString() : null;
              updateLocal({ dueDate: iso });
              void patch({ dueDate: iso });
            }}
          />
        </div>

        {/* Meta */}
        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4 text-xs text-muted-foreground">
          {task.creator && <p>Created by <span className="font-medium text-foreground">{task.creator.name ?? "Unknown"}</span></p>}
          <p>{fmt(task.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Subtasks tab ───────────────────────────────────────────────────────────
function SubtasksTab({ taskId, items, setItems, userRole }: {
  taskId: string; items: SubTask[] | null;
  setItems: (v: SubTask[]) => void; userRole: string;
}) {
  const [newTitle, setNewTitle] = useState("");
  const canEdit = ["SUPER_ADMIN","OWNER","MANAGER","DEVELOPER"].includes(userRole);

  async function toggle(id: string, completed: boolean) {
    await fetch(`/api/tasks/${taskId}/subtasks/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    setItems(items!.map(s => s.id === id ? { ...s, completed: !completed } : s));
  }

  async function remove(id: string) {
    await fetch(`/api/tasks/${taskId}/subtasks/${id}`, { method: "DELETE" });
    setItems(items!.filter(s => s.id !== id));
  }

  async function add() {
    if (!newTitle.trim()) return;
    const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    const j = await res.json();
    if (j.success) { setItems([...(items ?? []), j.data]); setNewTitle(""); }
  }

  if (!items) return <Spinner />;

  const done = items.filter(s => s.completed).length;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Subtasks</p>
        <span className="text-xs text-muted-foreground">{done}/{items.length} done</span>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-md border border-border p-2">
            <button
              onClick={() => void toggle(s.id, s.completed)}
              className={cn("flex size-4 shrink-0 items-center justify-center rounded border", s.completed ? "border-primary bg-primary text-primary-foreground" : "border-border")}
            >
              {s.completed && <Check className="size-2.5" />}
            </button>
            <span className={cn("flex-1 text-sm", s.completed && "line-through text-muted-foreground")}>{s.title}</span>
            {canEdit && (
              <button onClick={() => void remove(s.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="mt-3 flex gap-2">
          <Input className="h-8 text-sm" placeholder="Add subtask…" value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void add(); }}
          />
          <Button size="sm" className="h-8" onClick={void add} disabled={!newTitle.trim()}>Add</Button>
        </div>
      )}
    </div>
  );
}

// ─── Checklist tab ──────────────────────────────────────────────────────────
function ChecklistTab({ taskId, items, setItems, userRole }: {
  taskId: string; items: ChecklistItem[] | null;
  setItems: (v: ChecklistItem[]) => void; userRole: string;
}) {
  const [newTitle, setNewTitle] = useState("");
  const canEdit = ["SUPER_ADMIN","OWNER","MANAGER","DEVELOPER"].includes(userRole);

  async function toggle(id: string, checked: boolean) {
    await fetch(`/api/tasks/${taskId}/checklist/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: !checked }),
    });
    setItems(items!.map(c => c.id === id ? { ...c, checked: !checked } : c));
  }

  async function remove(id: string) {
    await fetch(`/api/tasks/${taskId}/checklist/${id}`, { method: "DELETE" });
    setItems(items!.filter(c => c.id !== id));
  }

  async function add() {
    if (!newTitle.trim()) return;
    const res = await fetch(`/api/tasks/${taskId}/checklist`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    const j = await res.json();
    if (j.success) { setItems([...(items ?? []), j.data]); setNewTitle(""); }
  }

  if (!items) return <Spinner />;

  const checked = items.filter(c => c.checked).length;
  const pct = items.length > 0 ? Math.round((checked / items.length) * 100) : 0;

  return (
    <div className="p-6">
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Checklist</span>
          <span className="text-xs text-muted-foreground">{checked}/{items.length} · {pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-md border border-border p-2">
            <button
              onClick={() => void toggle(c.id, c.checked)}
              className={cn("flex size-4 shrink-0 items-center justify-center rounded border", c.checked ? "border-primary bg-primary text-primary-foreground" : "border-border")}
            >
              {c.checked && <Check className="size-2.5" />}
            </button>
            <span className={cn("flex-1 text-sm", c.checked && "line-through text-muted-foreground")}>{c.title}</span>
            {canEdit && (
              <button onClick={() => void remove(c.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="mt-3 flex gap-2">
          <Input className="h-8 text-sm" placeholder="Add item…" value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void add(); }}
          />
          <Button size="sm" className="h-8" onClick={void add} disabled={!newTitle.trim()}>Add</Button>
        </div>
      )}
    </div>
  );
}

// ─── Comments tab ───────────────────────────────────────────────────────────
function CommentsTab({ taskId, items, setItems, currentUserId, userRole }: {
  taskId: string; items: Comment[] | null;
  setItems: (v: Comment[]) => void; currentUserId: string; userRole: string;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft.trim() }),
    });
    const j = await res.json();
    if (j.success) {
      setItems([...(items ?? []), j.data]);
      setDraft("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    setSending(false);
  }

  async function remove(id: string) {
    await fetch(`/api/tasks/${taskId}/comments/${id}`, { method: "DELETE" });
    setItems(items!.filter(c => c.id !== id));
  }

  if (!items) return <Spinner />;

  const canDelete = (authorId: string) =>
    ["SUPER_ADMIN","OWNER","MANAGER"].includes(userRole) || authorId === currentUserId;

  return (
    <div className="flex flex-col" style={{ height: "420px" }}>
      <div className="flex-1 overflow-y-auto p-6">
        {items.length === 0 && <p className="text-sm italic text-muted-foreground">No comments yet. Be the first!</p>}
        {items.map((c) => {
          const initials = (c.author.name ?? "?").split(" ").map(p=>p[0]).slice(0,2).join("").toUpperCase();
          return (
            <div key={c.id} className="mb-4 flex gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
                {initials}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-foreground">{c.author.name ?? "Unknown"}</span>
                  <span className="text-xs text-muted-foreground">{fmt(c.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{c.content}</p>
              </div>
              {canDelete(c.author.id) && (
                <button onClick={() => void remove(c.id)} className="self-start text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Textarea
            className="min-h-0 resize-none text-sm"
            rows={2}
            placeholder="Write a comment…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send(); }}
          />
          <Button size="sm" disabled={!draft.trim() || sending} onClick={void send} className="self-end">
            <Send className="size-3.5" />
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Ctrl+Enter to send</p>
      </div>
    </div>
  );
}

// ─── Time tab ───────────────────────────────────────────────────────────────
function TimeTab({ taskId, items, setItems, currentUserId, userRole }: {
  taskId: string; items: TimeEntry[] | null;
  setItems: (v: TimeEntry[]) => void; currentUserId: string; userRole: string;
}) {
  const [mins, setMins] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function log() {
    const m = parseInt(mins);
    if (!m || m < 1) return;
    setSaving(true);
    const res = await fetch(`/api/tasks/${taskId}/time`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes: m, note: note.trim() || null }),
    });
    const j = await res.json();
    if (j.success) { setItems([j.data, ...(items ?? [])]); setMins(""); setNote(""); }
    setSaving(false);
  }

  async function remove(id: string) {
    await fetch(`/api/tasks/${taskId}/time/${id}`, { method: "DELETE" });
    setItems(items!.filter(e => e.id !== id));
  }

  if (!items) return <Spinner />;

  const totalMins = items.reduce((sum, e) => sum + e.minutes, 0);
  const canDelete = (userId: string) =>
    ["SUPER_ADMIN","OWNER","MANAGER"].includes(userRole) || userId === currentUserId;

  return (
    <div className="p-6">
      <div className="mb-4 rounded-lg bg-accent px-4 py-3">
        <p className="text-xs text-muted-foreground">Total time logged</p>
        <p className="text-2xl font-semibold text-foreground">{fmtMins(totalMins)}</p>
      </div>

      <div className="mb-4 flex gap-2">
        <Input className="h-8 w-24 text-sm" type="number" min={1} placeholder="Minutes"
          value={mins} onChange={(e) => setMins(e.target.value)} />
        <Input className="h-8 flex-1 text-sm" placeholder="Note (optional)"
          value={note} onChange={(e) => setNote(e.target.value)} />
        <Button size="sm" className="h-8" disabled={!mins || saving} onClick={void log}>Log</Button>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((e) => (
          <div key={e.id} className="flex items-start justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">{fmtMins(e.minutes)}</p>
              {e.note && <p className="mt-0.5 text-xs text-muted-foreground">{e.note}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {e.user.name ?? "Unknown"} · {fmt(e.createdAt)}
              </p>
            </div>
            {canDelete(e.user.id) && (
              <button onClick={() => void remove(e.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm italic text-muted-foreground">No time logged yet.</p>}
      </div>
    </div>
  );
}

// ─── Activity tab ───────────────────────────────────────────────────────────
const ACTION_LABEL: Record<string,string> = {
  CREATED:"created", UPDATED:"updated", DELETED:"deleted",
  ARCHIVED:"archived", RESTORED:"restored", INVITED:"invited",
};

function ActivityTab({ items }: { items: LogEntry[] | null }) {
  if (!items) return <Spinner />;
  return (
    <div className="p-6">
      {items.length === 0 && <p className="text-sm italic text-muted-foreground">No activity recorded.</p>}
      <div className="flex flex-col gap-4">
        {items.map((l) => (
          <div key={l.id} className="flex items-start gap-3">
            <div className="mt-0.5 size-2 shrink-0 rounded-full bg-primary" />
            <div>
              <p className="text-sm text-foreground">
                <span className="font-medium">{l.user.name ?? l.user.email}</span>{" "}
                {ACTION_LABEL[l.action] ?? l.action.toLowerCase()} this task
              </p>
              <p className="text-xs text-muted-foreground">{fmt(l.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}