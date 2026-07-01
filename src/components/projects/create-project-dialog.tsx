// PASTE LOCATION: src/components/projects/create-project-dialog.tsx (overwrite entire file)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProjectSchema, type CreateProjectFormInput } from "@/validations/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import type { ProjectData } from "./project-card";

export function CreateProjectDialog({
  onCreated,
  defaultOpen = false,
}: {
  onCreated?: (project: ProjectData) => void;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open,         setOpen]         = useState(defaultOpen);
  const [serverError,  setServerError]  = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors } } =
    useForm<CreateProjectFormInput>({
      resolver: zodResolver(createProjectSchema),
      defaultValues: { status: "ACTIVE", priority: "MEDIUM" },
    });

  async function onSubmit(values: CreateProjectFormInput) {
    setServerError(null);
    setIsSubmitting(true);

    // Convert "YYYY-MM-DD" → ISO if dueDate came from a date input
    const body = {
      ...values,
      dueDate: values.dueDate
        ? new Date((values.dueDate as string).length === 10
            ? (values.dueDate as string) + "T00:00:00.000Z"
            : (values.dueDate as string)
          ).toISOString()
        : null,
    };

    try {
      const res  = await fetch("/api/projects", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const json = await res.json();

      if (!json.success) { setServerError(json.message); return; }

      setOpen(false);
      reset();

      if (onCreated) {
        const d = json.data;
        onCreated({
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
      } else {
        router.refresh();
      }
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          New project
        </Button>
      </DialogTrigger>

      <DialogContent
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target?.closest?.("[data-radix-popper-content-wrapper]")) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Create a new project</DialogTitle>
          <DialogDescription>
            Projects organize your team&apos;s tasks. You can change these details later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Website redesign" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="What's this project about?" {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Controller control={control} name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Label>Status</Label>
              <Controller control={control} name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="ON_HOLD">On hold</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dueDate">Due date <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="dueDate" type="date" {...register("dueDate")} />
          </div>

          {serverError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}