import Link from "next/link";
import type { SubscriptionPlan } from "@prisma/client";
import { FolderPlus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  FREE: "Free plan",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

export function DashboardHeader({
  userName,
  organizationName,
  plan,
  canCreateProject,
  canInvite,
}: {
  userName: string | null;
  organizationName: string;
  plan: SubscriptionPlan;
  canCreateProject: boolean;
  canInvite: boolean;
}) {
  const today = new Date().toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs text-muted-foreground">
          {today} · {organizationName} ·{" "}
          <span className={plan === "FREE" ? undefined : "font-medium text-primary"}>{PLAN_LABELS[plan]}</span>
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}
        </h1>
      </div>
      {(canCreateProject || canInvite) && (
        <div className="flex flex-wrap gap-2">
          {canInvite && (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/team">
                <UserPlus className="size-3.5" /> Invite
              </Link>
            </Button>
          )}
          {canCreateProject && (
            <Button asChild size="sm">
              <Link href="/projects?create=1">
                <FolderPlus className="size-3.5" /> New project
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
