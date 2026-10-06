import { prisma } from "@/lib/db/prisma";
import { ok, route } from "@/lib/api/handler";
import { clientIp } from "@/lib/api/rate-limit";
import { requireActor } from "@/lib/api/session";

function deviceLabel(userAgent: string) {
  if (/Mobi|Android/i.test(userAgent)) return /iPhone/i.test(userAgent) ? "iPhone" : "Mobile device";
  if (/Macintosh/i.test(userAgent)) return "Mac";
  if (/Windows/i.test(userAgent)) return "Windows PC";
  if (/Linux/i.test(userAgent)) return "Linux";
  return "Unknown device";
}

/** Records the device and last-seen time for the current session (shown on the profile page). */
export const POST = route("users.touch_session", async (req) => {
  const actor = await requireActor();
  const sessionId = actor.session.user.sessionId;
  if (!sessionId) return ok({ touched: false });

  const userAgent = req.headers.get("user-agent") ?? "";
  // A revoked or expired session simply matches nothing.
  const { count } = await prisma.activeSession.updateMany({
    where: { sessionId, userId: actor.userId },
    data: { deviceLabel: deviceLabel(userAgent), userAgent, ipAddress: clientIp(req), lastSeenAt: new Date() },
  });
  return ok({ touched: count > 0 });
});
