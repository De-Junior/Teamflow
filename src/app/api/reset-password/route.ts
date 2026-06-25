// PASTE LOCATION: src/app/api/reset-password/route.ts (overwrite entire file)
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { resetPasswordSchema } from "@/validations/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;
    const record = await prisma.verificationToken.findUnique({ where: { token } });

    if (!record || record.expires < new Date()) {
      return NextResponse.json(
        { success: false, message: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    // ── Prevent password reuse ────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { email: record.identifier },
      select: { password: true },
    });

    if (user?.password) {
      const sameAsOld = await bcrypt.compare(password, user.password);
      if (sameAsOld) {
        return NextResponse.json(
          { success: false, message: "New password must be different from your current password." },
          { status: 400 }
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.identifier },
        data: { password: hashedPassword },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RESET_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}