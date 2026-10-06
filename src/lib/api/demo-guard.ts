import { isDemoAccount } from "@/lib/demo";
import { forbidden } from "./errors";
import type { Actor } from "./session";

/**
 * Everyone who tries the demo shares one Owner account. Actions that would
 * break it for the next visitor (deleting the organization, changing the
 * password, signing other visitors out, emailing strangers) are refused.
 * Everything else, including creating and editing work, stays open.
 */
export function forbidOnDemo(actor: Pick<Actor, "session">) {
  if (isDemoAccount(actor.session.user.email)) {
    throw forbidden("This action is disabled on the shared demo account so the demo stays intact for everyone.");
  }
}
