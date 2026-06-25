// PASTE LOCATION: src/validations/team.ts
import { z } from "zod";
import { Role } from "@prisma/client";

const ASSIGNABLE_ROLES = [Role.OWNER, Role.MANAGER, Role.DEVELOPER, Role.VIEWER] as const;

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(ASSIGNABLE_ROLES),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(ASSIGNABLE_ROLES),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;