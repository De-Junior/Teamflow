// PASTE LOCATION: src/components/dashboard/widgets/welcome-banner.tsx (overwrite entire file)
import Image from "next/image";
import { SubscriptionPlan } from "@prisma/client";

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  FREE: "Free plan",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

const PLAN_STYLES: Record<SubscriptionPlan, string> = {
  FREE: "bg-muted text-muted-foreground",
  PROFESSIONAL: "bg-primary/10 text-primary",
  ENTERPRISE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function WelcomeBanner({
  userName,
  organizationName,
  plan = "FREE",
}: {
  userName: string | null;
  organizationName: string;
  plan?: SubscriptionPlan;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-4">
        <Image
          src="/teamflow_logo.png"
          alt={organizationName}
          width={1877}
          height={838}
          style={{ width: "auto", height: "32px" }}
          priority
        />
        <div className="h-8 w-px bg-border" />
        <div>
          <p className="text-sm font-medium text-foreground">{organizationName}</p>
          <p className="text-xs text-muted-foreground">
            Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}
          </p>
        </div>
      </div>

      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${PLAN_STYLES[plan]}`}
      >
        {PLAN_LABELS[plan]}
      </span>
    </div>
  );
}