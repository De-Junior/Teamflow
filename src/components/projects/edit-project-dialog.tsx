// PASTE LOCATION: src/components/projects/edit-project-dialog.tsx (create new file)
"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Priority, ProjectStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import type { ProjectData } from "./project-card";

// Local schema — accepts "YYYY-MM-DD" from date input (converted to ISO before API call)
const editSchema = z.object({
  name:        z.string().min(1, "Project name is required").max(100),
  description: z.string().max(2000).optional(),
  status:      z.nativeEnum(ProjectStatus),
  priority:    z.nativeEnum(Priority),
  dueDate:     z.string().optional().nullable(),
});

type EditFormValues = z.infer<typeof editSchema>;

export function EditProjectDialog({
  project, open, onClose, onUpdated,
}: {
  project:   ProjectData;
  open:      boolean;
  onClose:   () => void;
  onUpdated: (updated: Partial<ProjectData> & { id: string }) => void;
}) {
  const [serverError,  setServerError]  = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } =
    useForm<EditFormValues>({
      resolver: zodResolver(editSchema),
      defaultValues: {
        name:        project.name,
        description: project.description ?? "",
        status:      project.status   as ProjectStatus,
        priority:    project.priority as Priority,
        dueDate:     project.dueDate  ? project.dueDate.slice(0, 10) : "",
      },
    });

  async function onSubmit(values: EditFormValues) {
    setServerError(null);
    setIsSubmitting(true);

    // Convert "YYYY-MM-DD" → ISO datetime that the API schema expects
    const body = {
      ...values,
      dueDate: values.dueDate
        ? new Date(values.dueDate + "T00:00:00.000Z").toISOString()
        : null,
    };

    try {
      const res  = await fetch(`/api/projects/${project.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) { setServerError(json.message); return; }

      onUpdated({
        id:          project.id,
        name:        values.name,
        description: values.description ?? null,
        status:      values.status,
        priority:    values.priority,
        dueDate:     body.dueDate,
        updatedAt:   new Date().toISOString(),
      });
      onClose();
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target?.closest?.("[data-radix-popper-content-wrapper]")) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>Update &quot;{project.name}&quot;.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea id="edit-desc" rows={3} {...register("description")} />
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
            <Label htmlFor="edit-due">Due date</Label>
            <Input id="edit-due" type="date" {...register("dueDate")} />
          </div>

          {serverError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}