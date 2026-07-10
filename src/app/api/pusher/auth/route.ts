import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPusher } from "@/lib/pusher/server";
import { getUserMembership } from "@/lib/db/tenant";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const socketId = formData.get("socket_id") as string | null;
  const channelName = formData.get("channel_name") as string | null;

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
  }

  if (channelName.startsWith("private-user-")) {
    const targetUserId = channelName.replace("private-user-", "");
    if (targetUserId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (channelName.startsWith("private-org-")) {
    const targetOrgId = channelName.replace("private-org-", "");
    const membership = await getUserMembership(session.user.id, targetOrgId);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Unknown channel" }, { status: 400 });
  }

  const authResponse = getPusher().authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}
