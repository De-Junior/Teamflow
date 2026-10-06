"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const invitedEmail = searchParams.get("email") ?? "";

  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: invitedEmail ? { email: invitedEmail } : undefined,
  });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      await api.post("/api/register", { ...values, inviteToken: inviteToken ?? undefined });
      router.push(
        inviteToken ? "/login?registered=true&fromInvite=true" : "/login?registered=true"
      );
    } catch (err) {
      // Show field problems next to the field; everything else above the button.
      const fields = err instanceof ApiClientError ? err.fields ?? {} : {};
      const known = (["name", "email", "password"] as const).filter((f) => fields[f]);
      known.forEach((f) => setError(f, { message: fields[f] }));
      if (err instanceof ApiClientError && err.code === "conflict") setError("email", { message: err.message });
      else if (known.length === 0) setServerError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" placeholder="Jay Mokoena" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          readOnly={!!invitedEmail}
          {...register("email")}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-1">
        {isSubmitting ? "Creating your workspace…" : "Create account"}
      </Button>
    </form>
  );
}