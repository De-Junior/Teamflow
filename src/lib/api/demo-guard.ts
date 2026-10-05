import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { isDemoAccount } from "@/lib/demo";

/**
 * Everyone who tries the demo shares one Owner account. Actions that would
 * break it for the next visitor (deleting the organization, changing the
 * password, signing other visitors out, emailing strangers) return a 403.
 * Everything else, including creating and editing work, stays open.
 */
export function blockOnDemo(session: Session | null): NextResponse | null {
  if (!isDemoAccount(session?.user?.email)) return null;
  return NextResponse.json(
    {
      success: false,
      message: "This action is disabled on the shared demo account so the demo stays intact for everyone.",
    },
    { status: 403 }
  );
}
