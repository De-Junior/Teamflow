// PASTE LOCATION: src/app/api/verify-email/route.ts (new file)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ success: false, message: "Invalid verification link." }, { status: 400 });
    }

    const record = await prisma.verificationToken.findUnique({ where: { token } });

    if (!record || record.expires < new Date()) {
      return NextResponse.json(
        { success: false, message: "This verification link is invalid or has expired." },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.identifier },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VERIFY_EMAIL_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}