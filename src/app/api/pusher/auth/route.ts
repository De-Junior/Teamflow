import { NextResponse } from "next/server";
import { badRequest, forbidden } from "@/lib/api/errors";
import { route } from "@/lib/api/handler";
import { requireActor } from "@/lib/api/session";
import { getUserMembership } from "@/lib/db/tenant";
import { getPusher } from "@/lib/pusher/server";

/**
 * Authorizes a private Pusher channel. A user may only subscribe to their own
 * channel and to organizations they belong to. The success body is Pusher's
 * own format (not our envelope), because pusher-js reads it directly.
 */
export const POST = route("pusher.auth", async (req) => {
  const actor = await requireActor();
  const form = await req.formData().catch(() => null);
  const socketId = form?.get("socket_id");
  const channel = form?.get("channel_name");
  if (typeof socketId !== "string" || typeof channel !== "string") {
    throw badRequest("socket_id and channel_name are required.");
  }

  if (channel.startsWith("private-user-")) {
    if (channel.slice("private-user-".length) !== actor.userId) throw forbidden();
  } else if (channel.startsWith("private-org-")) {
    if (!(await getUserMembership(actor.userId, channel.slice("private-org-".length)))) throw forbidden();
  } else {
    throw badRequest("Unknown channel.");
  }

  return NextResponse.json(getPusher().authorizeChannel(socketId, channel));
});
