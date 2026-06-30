// PASTE LOCATION: src/app/(dashboard)/settings/notifications/page.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ToggleRow = { key: string; label: string; description: string };

const EMAIL_ROWS: ToggleRow[] = [
  { key: "email_mentions", label: "Mentions", description: "When someone mentions you in a comment." },
  { key: "email_assignments", label: "Assignments", description: "When a task is assigned to you." },
  { key: "email_invites", label: "Invitations", description: "When you're invited to an organization." },
];

const PUSH_ROWS: ToggleRow[] = [
  { key: "push_mentions", label: "Mentions", description: "Browser notification on new mentions." },
  { key: "push_assignments", label: "Assignments", description: "Browser notification on new assignments." },
];

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function NotificationsSettingsPage() {
  const [values, setValues] = useState<Record<string, boolean>>({
    email_mentions: true,
    email_assignments: true,
    email_invites: true,
    push_mentions: false,
    push_assignments: false,
  });

  function toggle(key: string) {
    setValues((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="rounded-md border border-dashed border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        These preferences aren&apos;t saved yet — the notification system itself is still being
        built. This is a preview of what&apos;s coming.
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email</CardTitle>
          <CardDescription>What you get notified about by email.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          {EMAIL_ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.description}</p>
              </div>
              <Toggle checked={values[row.key]} onChange={() => toggle(row.key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Push</CardTitle>
          <CardDescription>Browser notifications while TeamFlow is open.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          {PUSH_ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.description}</p>
              </div>
              <Toggle checked={values[row.key]} onChange={() => toggle(row.key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button disabled className="w-fit" title="Not wired up yet">
        Save preferences
      </Button>
    </div>
  );
}