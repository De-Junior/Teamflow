"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorMessage, fieldError } from "@/lib/api-client";

function PasswordInput({
  id,
  label,
  value,
  onChange,
  disabled,
  autoComplete,
  hint,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  autoComplete: string;
  hint?: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          className="pr-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (!hasPassword) {
    return (
      <p className="max-w-md text-sm text-muted-foreground">
        You sign in with Google, so there&apos;s no TeamFlow password to change. Manage your password in your Google account.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch("/api/users", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password changed.");
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  const currentError = fieldError(error, "currentPassword");
  const newError = fieldError(error, "newPassword");
  const formError = error && !currentError && !newError ? errorMessage(error) : null;

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <PasswordInput
        id="current-password"
        label="Current password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={setCurrentPassword}
        disabled={saving}
        error={currentError}
      />
      <PasswordInput
        id="new-password"
        label="New password"
        autoComplete="new-password"
        value={newPassword}
        onChange={setNewPassword}
        disabled={saving}
        hint="At least 8 characters, with an uppercase letter and a number."
        error={newError}
      />

      {formError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      )}

      <div>
        <Button type="submit" variant="outline" disabled={saving || !currentPassword || !newPassword}>
          {saving ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
