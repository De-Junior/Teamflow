import { prisma } from "@/lib/db/prisma";
import { Role, type Prisma } from "@prisma/client";
import { slugify } from "@/lib/utils/slugify";

async function uniqueSlug(tx: Prisma.TransactionClient, name: string) {
  const base = slugify(name) || "team";
  let slug = base;
  for (let suffix = 1; await tx.organization.findUnique({ where: { slug }, select: { id: true } }); suffix++) {
    slug = `${base}-${suffix}`;
  }
  return slug;
}

/** Creates a personal organization owned by the user, with a free subscription. */
export async function createPersonalOrganization(tx: Prisma.TransactionClient, userId: string, userName: string | null) {
  const organization = await tx.organization.create({
    data: {
      name: userName ? `${userName}'s Organization` : "My Organization",
      slug: await uniqueSlug(tx, userName ?? "team"),
    },
  });
  await tx.membership.create({
    data: { tenantId: organization.id, organizationId: organization.id, userId, role: Role.OWNER },
  });
  await tx.subscription.create({ data: { organizationId: organization.id } });
  return organization;
}

/** Returns the user's first organization, creating a personal one if they have none (e.g. first Google sign-in). */
export async function ensureOrganization(userId: string, userName: string | null) {
  const existing = await prisma.membership.findFirst({
    where: { userId },
    include: { organization: true },
    orderBy: { joinedAt: "asc" },
  });

  if (existing) {
    return {
      organizationId: existing.organizationId,
      role: existing.role,
      organizationSlug: existing.organization.slug,
    };
  }

  const organization = await prisma.$transaction((tx) => createPersonalOrganization(tx, userId, userName));
  return { organizationId: organization.id, role: Role.OWNER, organizationSlug: organization.slug };
}
