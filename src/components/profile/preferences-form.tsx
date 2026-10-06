"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTheme } from "@/components/providers/theme-provider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonList } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { useApiQuery } from "@/hooks/use-api-query";
import { api, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Prefs = {
  emailNotifications: boolean;
  taskAssignedNotif: boolean;
  defaultView: string;
};

const KEY = ["me", "preferences"];

const NOTIFICATION_OPTIONS = [
  { key: "taskAssignedNotif", label: "Notify me when I'm assigned a task" },
  { key: "emailNotifications", label: "Also send those notifications by email" },
] as const;

export function PreferencesForm() {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const { data: prefs, isPending, isError, refetch } = useApiQuery<Prefs>(KEY, "/api/users/preferences");

  // Optimistic: the control updates immediately and rolls back if saving fails.
  async function update(patch: Partial<Prefs>) {
    const previous = queryClient.getQueryData<Prefs>(KEY);
    queryClient.setQueryData<Prefs>(KEY, (p) => (p ? { ...p, ...patch } : p));
    try {
      await api.patch("/api/users/preferences", patch);
      toast.success("Preferences saved.");
    } catch (err) {
      queryClient.setQueryData(KEY, previous);
      toast.error(errorMessage(err));
    }
  }

  if (isPending) return <SkeletonList rows={3} />;
  if (isError) return <ErrorState message="Your preferences didn't load." onRetry={() => void refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-foreground">Theme</legend>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={theme === t}
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
      </fieldset>

      <div>
        <Label htmlFor="default-view" className="mb-2 block">Default project view</Label>
        <Select value={prefs.defaultView} onValueChange={(v) => void update({ defaultView: v })}>
          <SelectTrigger id="default-view" className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="kanban">Kanban</SelectItem>
            <SelectItem value="list">List</SelectItem>
            <SelectItem value="calendar">Calendar</SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-1.5 text-xs text-muted-foreground">Projects open in this view.</p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-foreground">Notifications</legend>
        <div className="flex flex-col gap-2">
          {NOTIFICATION_OPTIONS.map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={prefs[key]}
                disabled={key === "emailNotifications" && !prefs.taskAssignedNotif}
                onChange={(e) => void update({ [key]: e.target.checked })}
                className="h-4 w-4 rounded accent-primary disabled:opacity-50"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
