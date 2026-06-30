// PASTE LOCATION: src/app/api/billing/checkout/route.ts (new file)
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/stripe/client";
import { PLAN_PRICE_IDS } from "@/lib/stripe/plans";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { createCheckoutSchema } from "@/validations/billing";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role as Role, "org:billing");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    throw error;
  }

  const ctx = {
    tenantId: session.user.tenantId,
    organizationId: session.user.organizationId,
    userId: session.user.id,
  };

  try {
    const body = await req.json();
    const parsed = createCheckoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const priceId = PLAN_PRICE_IDS[parsed.data.plan];

    // Subscription is 1:1 with Organization (organizationId is unique on the model),
    // so it doubles as the tenant boundary even though it has no tenantId column.
    let subscription = await prisma.subscription.findUnique({
      where: { organizationId: ctx.organizationId },
    });

    let stripeCustomerId = subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email ?? undefined,
        metadata: { organizationId: ctx.organizationId },
      });
      stripeCustomerId = customer.id;

      subscription = await prisma.subscription.upsert({
        where: { organizationId: ctx.organizationId },
        create: {
          organizationId: ctx.organizationId,
          stripeCustomerId,
          plan: "FREE",
          status: "TRIALING",
        },
        update: { stripeCustomerId },
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/organization?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/organization?checkout=canceled`,
      metadata: { organizationId: ctx.organizationId },
    });

    return NextResponse.json({ success: true, data: { url: checkoutSession.url } });
  } catch (error) {
    console.error("[BILLING_CHECKOUT_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}