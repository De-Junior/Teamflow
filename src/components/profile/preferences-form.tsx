// PASTE LOCATION: src/components/profile/preferences-form.tsx (create new file)
"use client";

import { useState, useEffect } from "react";
import { useTheme }            from "@/components/providers/theme-provider";
import { Label }               from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn }                  from "@/lib/utils";

type Prefs = {
  theme: string; emailNotifications: boolean;
  taskAssignedNotif: boolean; taskUpdatedNotif: boolean; defaultView: string;
};

export function PreferencesForm() {
  const { theme, setTheme } = useTheme();
  const [prefs, setPrefs]   = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/users/preferences").then(r => r.json()).then(j => { if (j.success) setPrefs(j.data); });
  }, []);

  async function update(patch: Partial<Prefs>) {
    setPrefs(p => p ? { ...p, ...patch } : p);
    setSaving(true);
    try {
      await fetch("/api/users/preferences", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      });
    } finally { setSaving(false); }
  }

  if (!prefs) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      {/* Theme */}
      <div>
        <Label className="mb-2 block">Theme</Label>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <button key={t}
              onClick={() => setTheme(t)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm capitalize transition-colors",
                theme === t ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Default view */}
      <div>
        <Label className="mb-2 block">Default project view</Label>
        <Select value={prefs.defaultView} onValueChange={(v) => void update({ defaultView: v })}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="kanban">Kanban</SelectItem>
            <SelectItem value="list">List</SelectItem>
            <SelectItem value="calendar">Calendar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications */}
      <div>
        <Label className="mb-2 block">Notifications</Label>
        <div className="flex flex-col gap-2">
          {[
            { key: "emailNotifications", label: "Email notifications" },
            { key: "taskAssignedNotif",  label: "When I'm assigned a task" },
            { key: "taskUpdatedNotif",   label: "When my tasks are updated" },
          ].map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={prefs[key as keyof Prefs] as boolean}
                onChange={(e) => void update({ [key]: e.target.checked } as Partial<Prefs>)}
                className="h-4 w-4 rounded accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {saving && <p className="text-xs text-muted-foreground">Saving…</p>}
    </div>
  );
}