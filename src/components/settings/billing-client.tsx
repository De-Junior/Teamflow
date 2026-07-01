/* eslint-disable react-hooks/immutability */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

type BillingData = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
};

type PlanDetail = {
  label: string;
  description: string;
  price: string;
  features: string[];
};

const PLAN_DETAILS: { [K in SubscriptionPlan]: PlanDetail } = {
  FREE: {
    label: "Free",
    description: "For individuals and small teams getting started.",
    price: "$0 / month",
    features: ["Up to 3 projects", "5 team members", "Basic analytics"],
  },
  PROFESSIONAL: {
    label: "Professional",
    description: "For growing teams that need more power.",
    price: "R399.00 / month",
    features: [
      "Unlimited projects",
      "Up to 20 team members",
      "Advanced analytics",
      "Priority support",
      "AI features",
    ],
  },
  ENTERPRISE: {
    label: "Enterprise",
    description: "For large organizations with advanced needs.",
    price: "R799.00 / month",
    features: [
      "Unlimited everything",
      "SSO / SAML",
      "Custom roles",
      "Audit logs",
      "SLA guarantee",
      "Dedicated support",
    ],
  },
};

export function BillingClient({ billing }: { billing: BillingData }) {
  const [loading, setLoading] = useState<string | null>(null);

  const currentPlan = PLAN_DETAILS[billing.plan];
  const isOnPaidPlan = billing.plan !== "FREE";

  async function handleUpgrade(plan: "PROFESSIONAL" | "ENTERPRISE") {
    setLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (json.success && json.data?.url) {
        window.location.href = json.data.url;
      } else {
        alert(json.message ?? "Something went wrong.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function handleManageBilling() {
    setLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json();
      if (json.success && json.data?.url) {
        window.location.href = json.data.url;
      } else {
        alert(json.message ?? "Something went wrong.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium text-foreground">Current plan</h2>
        <p className="text-xs text-muted-foreground">
          You are on the{" "}
          <span className="font-semibold">{currentPlan.label}</span> plan.
          {billing.cancelAtPeriodEnd && billing.currentPeriodEnd && (
            <span className="ml-1 text-destructive">
              Cancels on {new Date(billing.currentPeriodEnd).toLocaleDateString()}.
            </span>
          )}
          {!billing.cancelAtPeriodEnd && billing.currentPeriodEnd && (
            <span className="ml-1">
              Renews on {new Date(billing.currentPeriodEnd).toLocaleDateString()}.
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(["FREE", "PROFESSIONAL", "ENTERPRISE"] as SubscriptionPlan[]).map((planKey) => {
          const plan = PLAN_DETAILS[planKey];
          const isCurrent = billing.plan === planKey;

          return (
            <Card
              key={planKey}
              className={`flex flex-col gap-4 p-5 ${
                isCurrent ? "border-primary ring-1 ring-primary" : ""
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{plan.label}</p>
                  {isCurrent && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
                <p className="mt-1 text-lg font-bold text-foreground">{plan.price}</p>
              </div>

              <ul className="flex flex-col gap-1.5">
                {plan.features.map((f: string) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span className="text-primary">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {isCurrent && isOnPaidPlan && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleManageBilling}
                    disabled={loading === "portal"}
                  >
                    {loading === "portal" ? "Redirecting…" : "Manage billing"}
                  </Button>
                )}
                {isCurrent && !isOnPaidPlan && (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Current plan
                  </Button>
                )}
                {!isCurrent && planKey !== "FREE" && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleUpgrade(planKey as "PROFESSIONAL" | "ENTERPRISE")}
                    disabled={!!loading}
                  >
                    {loading === planKey ? "Redirecting…" : `Upgrade to ${plan.label}`}
                  </Button>
                )}
                {!isCurrent && planKey === "FREE" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleManageBilling}
                    disabled={loading === "portal"}
                  >
                    {loading === "portal" ? "Redirecting…" : "Downgrade"}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}