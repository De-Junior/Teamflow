import { NextResponse } from "next/server";
import { resetDemoWorkspace } from "@/lib/demo-seed";

// Called daily by Vercel Cron (see vercel.json) so the public demo always has
// fresh, current-dated data and any visitor's changes are undone.
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await resetDemoWorkspace();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[DEMO_RESET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Demo reset failed" }, { status: 500 });
  }
}
