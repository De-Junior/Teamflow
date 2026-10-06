import { prisma } from "@/lib/db/prisma";
import { badRequest } from "@/lib/api/errors";
import { forbidOnDemo } from "@/lib/api/demo-guard";
import { ok, route } from "@/lib/api/handler";
import { requirePermission } from "@/lib/api/session";
import { getStripe } from "@/lib/stripe/client";

export const POST = route("billing.portal", async () => {
  const actor = await requirePermission("org:billing");
  forbidOnDemo(actor);

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: actor.tenant.organizationId },
    select: { stripeCustomerId: true },
  });
  if (!subscription?.stripeCustomerId) throw badRequest("This organization has no billing account yet.");

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });
  return ok({ url: portalSession.url });
});
