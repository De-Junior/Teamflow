import { ok, route } from "@/lib/api/handler";
import { requireActor } from "@/lib/api/session";
import { listMembers } from "@/services/members";

export const GET = route("members.list", async () => ok(await listMembers(await requireActor())));
