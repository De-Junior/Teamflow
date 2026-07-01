// PASTE LOCATION: src/app/api/register/route.ts (overwrite entire file)
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { registerSchema } from "@/validations/auth";
import { Prisma, Role, InvitationStatus } from "@prisma/client";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;
    const inviteToken: string | undefined = body.inviteToken;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let invitation = null;
    if (inviteToken) {
      invitation = await prisma.invitation.findUnique({ where: { token: inviteToken } });

      if (
        !invitation ||
        invitation.status !== InvitationStatus.PENDING ||
        invitation.expiresAt < new Date()
      ) {
        return NextResponse.json(
          { success: false, message: "This invitation is invalid or has expired." },
          { status: 400 }
        );
      }

      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json(
          {
            success: false,
            message: `This invitation was sent to ${invitation.email}. Please register with that email.`,
          },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          emailVerified: new Date(),
        },
      });

      if (invitation) {
        await tx.membership.create({
          data: {
            tenantId: invitation.organizationId,
            userId: user.id,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        });

        await tx.invitation.update({
          where: { token: inviteToken },
          data: { status: InvitationStatus.ACCEPTED },
        });

        const organization = await tx.organization.findUniqueOrThrow({
          where: { id: invitation.organizationId },
        });

        return { user, organization };
      }

      const baseSlug = slugify(name) || "team";
      let slug = baseSlug;
      let suffix = 1;
      while (await tx.organization.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${suffix++}`;
      }

      const organization = await tx.organization.create({
        data: {
          name: `${name}'s Organization`,
          slug,
        },
      });

      await tx.membership.create({
        data: {
          tenantId: organization.id,
          userId: user.id,
          organizationId: organization.id,
          role: Role.OWNER,
        },
      });

      await tx.subscription.create({
        data: {
          organizationId: organization.id,
        },
      });

      return { user, organization };
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: result.user.id,
        organizationSlug: result.organization.slug,
      },
    });
  } catch (error) {
    console.error("[REGISTER_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}