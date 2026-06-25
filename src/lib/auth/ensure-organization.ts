// PASTE LOCATION: src/lib/auth/ensure-organization.ts
import { prisma } from "@/lib/db/prisma";
import { slugify } from "@/lib/utils/slugify";
import { Prisma, Role } from "@prisma/client";

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

  const baseSlug = slugify(userName ?? "team") || "team";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const organization = await tx.organization.create({
      data: {
        name: userName ? `${userName}'s Organization` : "My Organization",
        slug,
      },
    });

    await tx.membership.create({
      data: {
        tenantId: organization.id,
        userId,
        organizationId: organization.id,
        role: Role.OWNER,
      },
    });

    await tx.subscription.create({
      data: { organizationId: organization.id },
    });

    return organization;
  });

  return {
    organizationId: result.id,
    role: Role.OWNER,
    organizationSlug: result.slug,
  };
}