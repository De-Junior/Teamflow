// PASTE LOCATION: src/app/api/users/route.ts (create new file)
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name, currentPassword, newPassword } = parsed.data;

    // ── Password change ────────────────────────────────────────────────────
    if (currentPassword !== undefined || newPassword !== undefined) {
      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { success: false, message: "Both current and new password are required." },
          { status: 400 }
        );
      }

      const dbUser = await prisma.user.findUnique({
        where:  { id: session.user.id },
        select: { password: true },
      });

      if (!dbUser?.password) {
        return NextResponse.json(
          { success: false, message: "No password set on this account." },
          { status: 400 }
        );
      }

      const currentMatch = await bcrypt.compare(currentPassword, dbUser.password);
      if (!currentMatch) {
        return NextResponse.json(
          { success: false, message: "Current password is incorrect." },
          { status: 400 }
        );
      }

      const isSame = await bcrypt.compare(newPassword, dbUser.password);
      if (isSame) {
        return NextResponse.json(
          { success: false, message: "New password must be different from your current password." },
          { status: 400 }
        );
      }

      const hashed = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: session.user.id }, data: { password: hashed } });
      return NextResponse.json({ success: true });
    }

    // ── Name update ────────────────────────────────────────────────────────
    if (name !== undefined) {
      await prisma.user.update({ where: { id: session.user.id }, data: { name } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: "Nothing to update." }, { status: 400 });
  } catch (error) {
    console.error("[USER_UPDATE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}