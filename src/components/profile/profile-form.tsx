// PASTE LOCATION: src/components/profile/profile-form.tsx (create new file + folder)
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export function ProfileForm({
  initialName,
  email,
  role,
  hasPassword,
}: {
  initialName:  string;
  email:        string;
  role:         string;
  hasPassword:  boolean;
}) {
  const { update } = useSession();

  // Name state
  const [name,        setName]        = useState(initialName);
  const [nameError,   setNameError]   = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [savingName,  setSavingName]  = useState(false);

  // Password state
  const [currentPw,   setCurrentPw]   = useState("");
  const [newPw,       setNewPw]       = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [pwError,     setPwError]     = useState<string | null>(null);
  const [pwSuccess,   setPwSuccess]   = useState(false);
  const [savingPw,    setSavingPw]    = useState(false);

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setNameError("Name is required."); return; }
    setNameError(null); setNameSuccess(false); setSavingName(true);
    try {
      const res  = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (!json.success) { setNameError(json.message); return; }
      await update({ name: name.trim() }); // reflect in session immediately
      setNameSuccess(true);
    } catch {
      setNameError("Something went wrong. Please try again.");
    } finally {
      setSavingName(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null); setPwSuccess(false); setSavingPw(true);
    try {
      const res  = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const json = await res.json();
      if (!json.success) { setPwError(json.message); return; }
      setPwSuccess(true);
      setCurrentPw(""); setNewPw("");
    } catch {
      setPwError("Something went wrong. Please try again.");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── Name & email ────────────────────────────────── */}
      <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameSuccess(false); }}
            disabled={savingName}
            maxLength={100}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Email</Label>
          <Input value={email} disabled />
          <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Role</Label>
          <Input value={role.charAt(0) + role.slice(1).toLowerCase()} disabled />
        </div>

        {nameError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {nameError}
          </p>
        )}
        {nameSuccess && (
          <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
            Name updated successfully.
          </p>
        )}

        <div>
          <Button
            type="submit"
            disabled={savingName || name.trim() === initialName || !name.trim()}
          >
            {savingName ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>

      {/* ── Password change ──────────────────────────────── */}
      {hasPassword && (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 border-t border-border pt-6">
          <div>
            <p className="text-sm font-medium text-foreground">Change password</p>
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters with one uppercase letter and one number.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="current-pw">Current password</Label>
            <div className="relative">
              <Input
                id="current-pw"
                type={showCurrent ? "text" : "password"}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="pr-10"
                disabled={savingPw}
              />
              <button type="button" tabIndex={-1}
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-pw">New password</Label>
            <div className="relative">
              <Input
                id="new-pw"
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="pr-10"
                disabled={savingPw}
              />
              <button type="button" tabIndex={-1}
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {pwError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {pwError}
            </p>
          )}
          {pwSuccess && (
            <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
              Password changed successfully.
            </p>
          )}

          <div>
            <Button
              type="submit"
              variant="outline"
              disabled={savingPw || !currentPw || !newPw}
            >
              {savingPw ? "Changing…" : "Change password"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}