import { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/validations/auth";
import { clientIp, hit, limits } from "@/lib/api/rate-limit";
import { ensureOrganization } from "./ensure-organization";

/** Surfaces to the login form as `result.code === "rate_limited"`. */
class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  // AUTH_SECRET is the Auth.js v5 name; NEXTAUTH_SECRET keeps v4-style env files working.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

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
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Slow down password guessing: per account from one address, plus a
        // looser cap per address across all accounts.
        const ip = clientIp(request);
        const [perAccount, perIp] = await Promise.all([
          hit(`sign-in:${ip}:${email}`, limits.signIn),
          hit(`sign-in:${ip}`, limits.signInPerIp),
        ]);
        if (!perAccount.allowed || !perIp.allowed) throw new TooManyAttempts();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          // Uploaded avatars are stored as data URLs; keep them out of the
          // JWT cookie; pages read the avatar from the database instead.
          image: user.image?.startsWith("data:") ? null : user.image,
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

        // A first-time Google sign-in has no organization yet; give them a
        // personal one so the session is usable (without it every page
        // redirected back to /login).
        const workspace = membership
          ? {
              organizationId: membership.organizationId,
              role: membership.role,
              organizationSlug: membership.organization.slug,
            }
          : await ensureOrganization(user.id as string, user.name ?? null);

        token.organizationId = workspace.organizationId;
        token.tenantId = workspace.organizationId;
        token.role = workspace.role;
        token.organizationSlug = workspace.organizationSlug;

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