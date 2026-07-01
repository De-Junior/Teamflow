// PASTE LOCATION: src/lib/auth/auth.config.ts (overwrite entire file)
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/validations/auth";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;

        const currentMembership = token.organizationId
          ? await prisma.membership.findFirst({
              where: { userId: user.id, organizationId: token.organizationId as string },
              include: { organization: true },
            })
          : null;

        const membership =
          currentMembership ??
          (await prisma.membership.findFirst({
            where: { userId: user.id },
            include: { organization: true },
            orderBy: { joinedAt: "asc" },
          }));

        if (membership) {
          token.organizationId = membership.organizationId;
          token.tenantId = membership.organizationId;
          token.role = membership.role;
          token.organizationSlug = membership.organization.slug;
        }

        // Active session tracking — only in Node runtime (not Edge middleware)
        if (typeof (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime === "undefined") {
          try {
            const sessionId = crypto.randomUUID();
            await prisma.activeSession.create({
              data: { userId: user.id as string, sessionId, deviceLabel: "Unknown device" },
            });
            token.sessionId = sessionId;
            token.sessionCheckedAt = Date.now();
          } catch (err) {
            console.error("[ACTIVE_SESSION_CREATE_ERROR]", err);
          }
        }
      }

      if (trigger === "update" && session) {
        if (session.organizationId) {
          token.organizationId = session.organizationId;
          token.tenantId = session.organizationId;
          token.role = session.role;
        }
        if (session.name !== undefined) {
          token.name = session.name;
        }
      }

      // Revocation check — re-checked at most every 5 minutes to limit DB load
      const isEdge = typeof (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime !== "undefined";
      const shouldCheck =
        !isEdge && token.sessionId &&
        (!token.sessionCheckedAt || Date.now() - (token.sessionCheckedAt as number) > 5 * 60 * 1000);

      if (shouldCheck) {
        try {
          const active = await prisma.activeSession.findUnique({
            where: { sessionId: token.sessionId as string },
          });
          if (active?.revoked) {
            return null; // forces sign-out on next request
          }
          token.sessionCheckedAt = Date.now();
        } catch (err) {
          console.error("[ACTIVE_SESSION_CHECK_ERROR]", err);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.organizationId = token.organizationId as string;
        session.user.tenantId = token.tenantId as string;
        session.user.role = token.role as string;
        session.user.organizationSlug = token.organizationSlug as string;
        session.user.sessionId = token.sessionId as string | undefined;
      }
      return session;
    },
  },
};