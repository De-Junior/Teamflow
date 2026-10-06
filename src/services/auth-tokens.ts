import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";

/**
 * One-time tokens for email verification and password reset.
 *
 * - Each purpose has its own identifier namespace, so a verification link can
 *   never be redeemed as a password reset (or cancel one).
 * - Only a SHA-256 hash is stored; the raw token exists only in the emailed
 *   link, so a database leak doesn't hand out working reset links.
 */

export type TokenPurpose = "verify-email" | "reset-password";

const TTL_MS: Record<TokenPurpose, number> = {
  "verify-email": 24 * 60 * 60 * 1000,
  "reset-password": 30 * 60 * 1000,
};

const identifierFor = (purpose: TokenPurpose, email: string) => `${purpose}:${email.toLowerCase()}`;
const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/** Issues a fresh token for this purpose, replacing any earlier one, and returns the raw value. */
export async function issueToken(purpose: TokenPurpose, email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const identifier = identifierFor(purpose, email);
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: { identifier, token: hash(token), expires: new Date(Date.now() + TTL_MS[purpose]) },
    }),
  ]);
  return token;
}

/**
 * Looks up an unexpired token for this purpose. Returns the email it was
 * issued for, plus the stored hash so the caller can delete it in the same
 * transaction as the change it authorises.
 */
export async function findValidToken(purpose: TokenPurpose, token: string) {
  const record = await prisma.verificationToken.findUnique({ where: { token: hash(token) } });
  const prefix = `${purpose}:`;
  if (!record || !record.identifier.startsWith(prefix) || record.expires < new Date()) return null;
  return { email: record.identifier.slice(prefix.length), storedToken: record.token };
}
