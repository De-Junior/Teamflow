// PASTE LOCATION: src/components/tasks/create-task-dialog.tsx (overwrite entire file)
"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTaskSchema, type CreateTaskFormInput } from "@/validations/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

type TeamMember = {
  user: { id: string; name: string | null; email: string; image: string | null };
};

export function CreateTaskDialog({
  projectId,
  defaultStatus,
  onCreated,
}: {
  projectId: string;
  defaultStatus: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersFetched, setMembersFetched] = useState(false);
  const loadingMembers = open && !membersFetched;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateTaskFormInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { priority: "MEDIUM", status: defaultStatus as never, projectId },
  });

  // Fetch team members each time the dialog opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    fetch("/api/members")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) setMembers(json.data);
      })
      .catch(() => {
        if (!cancelled) setServerError("Couldn't load team members.");
      })
      .finally(() => {
        if (!cancelled) setMembersFetched(true);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function onSubmit(values: CreateTaskFormInput) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, projectId, status: defaultStatus }),
      });
      const json = await res.json();

      if (!json.success) {
        setServerError(json.message);
        return;
      }

      setOpen(false);
      reset();
      onCreated();
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start text-muted-foreground">
          <Plus className="size-3.5" />
          Add task
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Add a task to this column.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Implement login page" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Optional details…" {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Assignee</Label>
              <Controller
                control={control}
                name="assigneeId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "unassigned"}
                    onValueChange={(val) => field.onChange(val === "unassigned" ? null : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingMembers ? "Loading…" : "Unassigned"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.user.id} value={m.user.id}>
                          {m.user.name ?? m.user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {serverError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}