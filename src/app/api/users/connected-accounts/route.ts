// PASTE LOCATION: src/app/api/users/connected-accounts/route.ts (create new file + folder)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const [accounts, user] = await Promise.all([
    prisma.account.findMany({
      where:  { userId: session.user.id },
      select: { id: true, provider: true, providerAccountId: true },
    }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } }),
  ]);

  return NextResponse.json({
    success: true,
    data: { accounts, hasPassword: !!user?.password },
  });
}