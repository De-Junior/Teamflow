// PASTE LOCATION: src/app/api/users/route.ts (overwrite entire file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";
import bcrypt           from "bcryptjs";
import { z }            from "zod";

const schema = z.object({
  name:     z.string().min(2).max(100).optional(),
  phone:    z.string().max(30).optional().nullable(),
  timezone: z.string().max(60).optional().nullable(),
  language: z.string().max(10).optional(),
  bio:      z.string().max(500).optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { currentPassword, newPassword, ...profileFields } = parsed.data;

    // Password change branch
    if (currentPassword !== undefined || newPassword !== undefined) {
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ success: false, message: "Both current and new password are required." }, { status: 400 });
      }
      const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } });
      if (!dbUser?.password) return NextResponse.json({ success: false, message: "No password set on this account." }, { status: 400 });

      const match = await bcrypt.compare(currentPassword, dbUser.password);
      if (!match) return NextResponse.json({ success: false, message: "Current password is incorrect." }, { status: 400 });

      const same = await bcrypt.compare(newPassword, dbUser.password);
      if (same) return NextResponse.json({ success: false, message: "New password must be different." }, { status: 400 });

      const hashed = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: session.user.id }, data: { password: hashed } });
      return NextResponse.json({ success: true });
    }

    // Profile fields branch
    if (Object.keys(profileFields).length > 0) {
      await prisma.user.update({ where: { id: session.user.id }, data: profileFields });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: "Nothing to update." }, { status: 400 });
  } catch (error) {
    console.error("[USER_UPDATE_ERROR]", error);
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, timezone: true, language: true, bio: true, image: true, createdAt: true },
  });
  return NextResponse.json({ success: true, data: user });
}