// PASTE LOCATION: src/app/api/notifications/route.ts (new file)

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { notificationRepository } from "@/lib/db/tenant";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = {
    tenantId: session.user.tenantId,
    organizationId: session.user.organizationId,
    userId: session.user.id,
  };

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const repo = notificationRepository(ctx);
  const [notifications, unreadCount] = await Promise.all([
    repo.findMany({ unreadOnly, take: 30 }),
    repo.unreadCount(),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = {
    tenantId: session.user.tenantId,
    organizationId: session.user.organizationId,
    userId: session.user.id,
  };

  const body = await request.json();
  const repo = notificationRepository(ctx);

  if (body.markAll) {
    await repo.markAllRead();
  } else if (body.id) {
    await repo.markRead(body.id);
  } else {
    return NextResponse.json({ error: "Missing id or markAll" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}