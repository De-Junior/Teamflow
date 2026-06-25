// PASTE LOCATION: src/lib/auth/auth.config.ts
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/validations/auth";
import { ensureOrganization } from "@/lib/auth/ensure-organization";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

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
        } else {
          if (!user.id) {
            return token;
          }
          const ensured = await ensureOrganization(user.id, user.name ?? null);
          token.organizationId = ensured.organizationId;
          token.tenantId = ensured.organizationId;
          token.role = ensured.role;
          token.organizationSlug = ensured.organizationSlug;
        }
      }

      if (trigger === "update" && session?.organizationId) {
        token.organizationId = session.organizationId;
        token.tenantId = session.organizationId;
        token.role = session.role;
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
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 60 * 3,
    updateAge: 30,
  },
};