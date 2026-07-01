// PASTE LOCATION: src/app/api/webhooks/stripe/route.ts (overwrite entire file)
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { planFromPriceId } from "@/lib/stripe/plans";
import { prisma } from "@/lib/db/prisma";
import Stripe from "stripe";
import type { SubscriptionStatus } from "@prisma/client";

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":   return "ACTIVE";
    case "past_due": return "PAST_DUE";
    case "canceled": return "CANCELED";
    case "trialing": return "TRIALING";
    default:         return "ACTIVE";
  }
}

// Stripe v22 wraps subscription in Response<T> which drops some legacy fields
// from the TypeScript surface. We extract period dates safely via this helper.
function extractPeriodDates(sub: Stripe.Subscription) {
  const raw = sub as unknown as Record<string, number>;
  const start = raw["current_period_start"]
    ? new Date(raw["current_period_start"] * 1000)
    : null;
  const end = raw["current_period_end"]
    ? new Date(raw["current_period_end"] * 1000)
    : null;
  return { start, end };
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[STRIPE_WEBHOOK_SIGNATURE_ERROR]", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency — skip events we've already processed
  try {
    await prisma.stripeWebhookEvent.create({
      data: { stripeEventId: event.id, type: event.type },
    });
  } catch {
    // Unique constraint violation means duplicate event — skip silently
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const organizationId = session.metadata?.organizationId;
        if (!organizationId) {
          console.error("[STRIPE_WEBHOOK] missing organizationId in metadata");
          break;
        }

        const subscriptionId = session.subscription as string;
        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = stripeSub.items.data[0]?.price.id ?? "";
        const plan = planFromPriceId(priceId);
        const { start, end } = extractPeriodDates(stripeSub as unknown as Stripe.Subscription);

        await prisma.subscription.upsert({
          where: { organizationId },
          create: {
            organizationId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            plan,
            status: "ACTIVE",
            currentPeriodStart: start,
            currentPeriodEnd: end,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          },
          update: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            plan,
            status: "ACTIVE",
            currentPeriodStart: start,
            currentPeriodEnd: end,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          },
        });

        console.log(`[STRIPE_WEBHOOK] org ${organizationId} upgraded to ${plan}`);
        break;
      }

      case "customer.subscription.updated": {
        const rawSub = event.data.object as Stripe.Subscription;
        const priceId = rawSub.items.data[0]?.price.id ?? "";
        const plan = planFromPriceId(priceId);
        const { start, end } = extractPeriodDates(rawSub);

        const existing = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: rawSub.id },
        });
        if (!existing) break;

        await prisma.subscription.update({
          where: { stripeSubscriptionId: rawSub.id },
          data: {
            plan,
            stripePriceId: priceId,
            status: mapStripeStatus(rawSub.status),
            currentPeriodStart: start,
            currentPeriodEnd: end,
            cancelAtPeriodEnd: rawSub.cancel_at_period_end,
          },
        });

        break;
      }

      case "customer.subscription.deleted": {
        const rawSub = event.data.object as Stripe.Subscription;

        const existing = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: rawSub.id },
        });
        if (!existing) break;

        await prisma.subscription.update({
          where: { stripeSubscriptionId: rawSub.id },
          data: {
            plan: "FREE",
            status: "CANCELED",
            cancelAtPeriodEnd: false,
            stripeSubscriptionId: null,
            stripePriceId: null,
            currentPeriodEnd: null,
            currentPeriodStart: null,
          },
        });

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        // Stripe v22 types invoice.subscription differently depending on API version
        const raw = invoice as unknown as Record<string, unknown>;
        const subscriptionId = (raw["subscription"] ?? raw["subscription_id"]) as string | null;
        if (!subscriptionId) break;

        const existing = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId },
        });
        if (!existing) break;

        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscriptionId },
          data: { status: "PAST_DUE" },
        });

        break;
      }
    }
  } catch (error) {
    console.error("[STRIPE_WEBHOOK_HANDLER_ERROR]", error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}