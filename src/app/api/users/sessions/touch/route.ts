// PASTE LOCATION: src/app/api/users/sessions/touch/route.ts (create new file + folder)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

function parseDevice(ua: string) {
  if (/Mobi|Android/i.test(ua))  return /iPhone/i.test(ua) ? "iPhone" : "Mobile device";
  if (/Macintosh/i.test(ua))     return "Mac";
  if (/Windows/i.test(ua))       return "Windows PC";
  if (/Linux/i.test(ua))         return "Linux";
  return "Unknown device";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.sessionId) return NextResponse.json({ success: false }, { status: 401 });

  const ua = req.headers.get("user-agent") ?? "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  try {
    await prisma.activeSession.update({
      where: { sessionId: session.user.sessionId },
      data:  { deviceLabel: parseDevice(ua), userAgent: ua, ipAddress: ip, lastSeenAt: new Date() },
    });
  } catch { /* session may have been revoked already — ignore */ }

  return NextResponse.json({ success: true });
}