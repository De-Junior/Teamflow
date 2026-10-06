import { prisma } from "@/lib/db/prisma";
import { forbidOnDemo } from "@/lib/api/demo-guard";
import { ok, route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requirePermission } from "@/lib/api/session";
import { getStripe } from "@/lib/stripe/client";
import { PLAN_PRICE_IDS } from "@/lib/stripe/plans";
import { createCheckoutSchema } from "@/validations/billing";

export const POST = route("billing.checkout", async (req) => {
  const actor = await requirePermission("org:billing");
  forbidOnDemo(actor);
  const { plan } = await parseBody(req, createCheckoutSchema);
  const { organizationId } = actor.tenant;

  // Subscription is 1:1 with Organization (organizationId is unique), so it
  // doubles as the tenant boundary even though it has no tenantId column.
  const subscription = await prisma.subscription.findUnique({ where: { organizationId } });
  const stripe = getStripe();

  let stripeCustomerId = subscription?.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: actor.session.user.email ?? undefined,
      metadata: { organizationId },
    });
    stripeCustomerId = customer.id;
    await prisma.subscription.upsert({
      where: { organizationId },
      create: { organizationId, stripeCustomerId, plan: "FREE", status: "TRIALING" },
      update: { stripeCustomerId },
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: PLAN_PRICE_IDS[plan], quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?checkout=canceled`,
    metadata: { organizationId },
  });

  return ok({ url: checkoutSession.url });
});
