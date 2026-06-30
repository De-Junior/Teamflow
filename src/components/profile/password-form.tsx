// PASTE LOCATION: src/components/profile/password-form.tsx (create new file)
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export function PasswordForm() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(false); setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.message); return; }
      setSuccess(true); setCurrentPw(""); setNewPw("");
    } catch {
      setError("Something went wrong.");
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="current-pw">Current password</Label>
        <div className="relative">
          <Input id="current-pw" type={showCurrent ? "text" : "password"} className="pr-10"
            value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} disabled={saving} />
          <button type="button" tabIndex={-1} onClick={() => setShowCurrent(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-pw">New password</Label>
        <div className="relative">
          <Input id="new-pw" type={showNew ? "text" : "password"} className="pr-10"
            value={newPw} onChange={(e) => setNewPw(e.target.value)} disabled={saving} />
          <button type="button" tabIndex={-1} onClick={() => setShowNew(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">8+ characters, one uppercase letter, one number.</p>
      </div>

      {error   && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {success && <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">Password changed.</p>}

      <div>
        <Button type="submit" variant="outline" disabled={saving || !currentPw || !newPw}>
          {saving ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}