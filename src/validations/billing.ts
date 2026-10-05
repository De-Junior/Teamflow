import { z } from "zod";

export const createCheckoutSchema = z.object({
  plan: z.enum(["PROFESSIONAL", "ENTERPRISE"]),
});