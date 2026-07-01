// PASTE LOCATION: src/app/(dashboard)/settings/billing/page.tsx (new file)
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { BillingClient } from "@/components/settings/billing-client";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const canManageBilling = hasPermission(session.user.role as Role, "org:billing");
  if (!canManageBilling) redirect("/settings/members");

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: session.user.organizationId },
    select: {
      plan: true,
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      stripeCustomerId: true,
    },
  });

  const billing = subscription ?? {
    plan: "FREE" as const,
    status: "ACTIVE" as const,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Billing</h2>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and payment details.
        </p>
      </div>
      <BillingClient
        billing={{
          ...billing,
          currentPeriodEnd: billing.currentPeriodEnd?.toISOString() ?? null,
        }}
      />
    </div>
  );
}