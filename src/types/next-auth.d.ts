// PASTE LOCATION: src/types/next-auth.d.ts (overwrite entire file)
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      tenantId: string;
      role: string;
      organizationSlug: string;
      sessionId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    organizationId?: string;
    tenantId?: string;
    role?: string;
    organizationSlug?: string;
    sessionId?: string;
    sessionCheckedAt?: number;
  }
}