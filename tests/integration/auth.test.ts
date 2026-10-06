import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hit } from "@/lib/api/rate-limit";
import { findValidToken, issueToken } from "@/services/auth-tokens";
import { acceptInvitation, inviteMember } from "@/services/invitations";
import { createOrganization, createUser, resetDatabase } from "./fixtures";

beforeEach(resetDatabase);

describe("rate limiting", () => {
  it("allows the limit, then blocks until the window ends", async () => {
    const limit = { limit: 2, windowSeconds: 60 };
    expect((await hit("test:key", limit)).allowed).toBe(true);
    expect((await hit("test:key", limit)).allowed).toBe(true);
    const third = await hit("test:key", limit);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);

    // Other keys have their own allowance.
    expect((await hit("test:other", limit)).allowed).toBe(true);

    // Once the window has passed, counting starts again.
    await prisma.rateLimit.update({ where: { key: "test:key" }, data: { resetAt: new Date(Date.now() - 1000) } });
    expect((await hit("test:key", limit)).allowed).toBe(true);
  });
});

describe("one-time tokens", () => {
  it("stores only a hash and cannot be redeemed for another purpose", async () => {
    const token = await issueToken("verify-email", "person@example.test");

    const stored = await prisma.verificationToken.findFirstOrThrow();
    expect(stored.token).not.toBe(token);

    expect(await findValidToken("reset-password", token)).toBeNull();
    expect(await findValidToken("verify-email", token)).toMatchObject({ email: "person@example.test" });
  });

  it("replaces an earlier token for the same purpose", async () => {
    const first = await issueToken("reset-password", "person@example.test");
    const second = await issueToken("reset-password", "person@example.test");

    expect(await findValidToken("reset-password", first)).toBeNull();
    expect(await findValidToken("reset-password", second)).not.toBeNull();
  });
});

describe("invitations", () => {
  it("can only be accepted by the invited email, and only once", async () => {
    const { actor, organization } = await createOrganization();
    const invitee = await createUser("Invitee");
    const stranger = await createUser("Stranger");
    await inviteMember(actor, { email: invitee.email, role: Role.DEVELOPER });
    const { token } = await prisma.invitation.findFirstOrThrow();

    await expect(acceptInvitation(stranger, token)).rejects.toMatchObject({ status: 403 });
    await expect(acceptInvitation(invitee, token)).resolves.toMatchObject({ organizationId: organization.id, role: Role.DEVELOPER });
    // A used invitation reads as invalid rather than expired.
    await expect(acceptInvitation(invitee, token)).rejects.toMatchObject({ status: 404 });
  });

  it("treats an expired invitation as gone", async () => {
    const { actor } = await createOrganization();
    const invitee = await createUser("Invitee");
    await inviteMember(actor, { email: invitee.email, role: Role.VIEWER });
    const invitation = await prisma.invitation.findFirstOrThrow();
    await prisma.invitation.update({ where: { id: invitation.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    await expect(acceptInvitation(invitee, invitation.token)).rejects.toMatchObject({ status: 410 });
  });
});
