import { z } from "zod";
import { created, route } from "@/lib/api/handler";
import { clientIp, enforce, limits } from "@/lib/api/rate-limit";
import { parseBody } from "@/lib/api/request";
import { registerAccount } from "@/services/accounts";
import { registerSchema } from "@/validations/auth";

const registerRequestSchema = registerSchema.and(z.object({ inviteToken: z.string().max(200).optional() }));

export const POST = route("auth.register", async (req) => {
  await enforce(`register:${clientIp(req)}`, limits.register);
  const { name, email, password, inviteToken } = await parseBody(req, registerRequestSchema);
  return created(await registerAccount({ name, email, password, inviteToken }));
});
