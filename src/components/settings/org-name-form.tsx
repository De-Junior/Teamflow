// PASTE LOCATION: src/components/settings/org-name-form.tsx (create new file)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});
type Input = z.infer<typeof schema>;

export function OrgNameForm({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { name: currentName },
  });

  async function onSubmit(values: Input) {
    setServerError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const res  = await fetch("/api/organizations", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(values),
      });
      const json = await res.json();

      if (!json.success) { setServerError(json.message); return; }

      setSuccess(true);
      router.refresh();
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="orgName">Organization name</Label>
        <Input
          id="orgName"
          placeholder="Acme Inc."
          className="max-w-sm"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {serverError && (
        <p className="max-w-sm rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}
      {success && (
        <p className="flex max-w-sm items-center gap-2 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700">
          <CheckCircle2 className="size-4" /> Organization name updated.
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}