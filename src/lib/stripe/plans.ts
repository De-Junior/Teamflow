// PASTE LOCATION: src/lib/stripe/plans.ts (new file)

import { SubscriptionPlan } from "@prisma/client";

export const PLAN_PRICE_IDS: Record<Exclude<SubscriptionPlan, "FREE">, string> = {
  PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL!,
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE!,
};

export function planFromPriceId(priceId: string): SubscriptionPlan {
  if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL) return "PROFESSIONAL";
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) return "ENTERPRISE";
  return "FREE";
}