// PASTE LOCATION: src/components/profile/profile-client.tsx (create new file)
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AvatarUpload }          from "@/components/profile/avatar-upload";
import { PersonalInfoForm }      from "@/components/profile/personal-info-form";
import { PasswordForm }          from "@/components/profile/password-form";
import { ConnectedAccountsPanel} from "@/components/profile/connected-accounts-panel";
import { PreferencesForm }       from "@/components/profile/preferences-form";
import { SessionsPanel }         from "@/components/profile/sessions-panel";
import { ActivityPanel }         from "@/components/profile/activity-panel";
import { MyTasksPanel }          from "@/components/profile/my-tasks-panel";
import { MyStatisticsPanel }     from "@/components/profile/my-statistics-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TABS = [
  { id: "personal",   label: "Personal Info"       },
  { id: "password",   label: "Password"            },
  { id: "accounts",   label: "Connected Accounts"  },
  { id: "preferences",label: "Preferences"         },
  { id: "sessions",   label: "Sessions"            },
  { id: "activity",   label: "Activity"            },
  { id: "tasks",      label: "My Tasks"            },
  { id: "stats",      label: "My Statistics"       },
] as const;

type TabId = typeof TABS[number]["id"];

export function ProfileClient({ user }: {
  user: {
    name: string; email: string; image: string | null;
    phone: string; timezone: string; language: string; bio: string;
  };
}) {
  const [tab, setTab] = useState<TabId>("personal");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account, security, and preferences.</p>
      </div>

      <AvatarUpload name={user.name} image={user.image} />

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{TABS.find(t => t.id === tab)?.label}</CardTitle></CardHeader>
        <CardContent>
          {tab === "personal" && (
            <PersonalInfoForm
              initialName={user.name} email={user.email}
              initialPhone={user.phone} initialTimezone={user.timezone}
              initialLanguage={user.language} initialBio={user.bio}
            />
          )}
          {tab === "password"    && <PasswordForm />}
          {tab === "accounts"    && <ConnectedAccountsPanel />}
          {tab === "preferences" && <PreferencesForm />}
          {tab === "sessions"    && <SessionsPanel />}
          {tab === "activity"    && <ActivityPanel />}
          {tab === "tasks"       && <MyTasksPanel />}
          {tab === "stats"       && <MyStatisticsPanel />}
        </CardContent>
      </Card>
    </div>
  );
}