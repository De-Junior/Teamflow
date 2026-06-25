// PASTE LOCATION: src/components/auth/accept-invite.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type InviteInfo = {
  email: string;
  role: string;
  organizationName: string;
};

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const { data: session, status: sessionStatus, update } = useSession();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invitations/${token}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          setLoadError(json.message);
          return;
        }
        setInvite(json.data);
      })
      .catch(() => setLoadError("Couldn't load this invitation. Please try again."));
  }, [token]);

  async function handleAccept() {
    setIsAccepting(true);
    setAcceptError(null);

    try {
      const res = await fetch(`/api/invitations/${token}`, { method: "POST" });
      const json = await res.json();

      if (!json.success) {
        setAcceptError(json.message);
        return;
      }

      await update({
        organizationId: json.data.organizationId,
        role: json.data.role,
      });

      router.push("/dashboard");
      router.refresh();
    } catch {
      setAcceptError("Something went wrong. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <p className="text-sm text-destructive">{loadError}</p>
        <Link href="/login" className="text-sm text-primary hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  if (!invite || sessionStatus === "loading") {
    return <div className="h-32 animate-pulse rounded-md bg-muted" />;
  }

  const isLoggedIn = sessionStatus === "authenticated";
  const loggedInEmail = session?.user?.email?.toLowerCase();
  const inviteEmail = invite.email.toLowerCase();
  const emailMismatch = isLoggedIn && loggedInEmail !== inviteEmail;

  return (
    <div className="flex flex-col gap-4 text-center">
      <p className="text-sm text-foreground">
        You&apos;ve been invited to join <strong>{invite.organizationName}</strong> as a{" "}
        <strong>{invite.role.toLowerCase()}</strong>.
      </p>

      {emailMismatch ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            This invitation was sent to <strong>{invite.email}</strong>, but you&apos;re signed
            in as {session?.user?.email}. Sign out and sign in with the invited email to accept.
          </p>
          <Link href={`/login?callbackUrl=/invite/${token}`} className="text-sm text-primary hover:underline">
            Switch accounts
          </Link>
        </div>
      ) : isLoggedIn ? (
        <>
          {acceptError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {acceptError}
            </p>
          )}
          <Button onClick={handleAccept} disabled={isAccepting}>
            {isAccepting ? "Joining…" : `Accept and join ${invite.organizationName}`}
          </Button>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Sign in or create an account with <strong>{invite.email}</strong> to accept.
          </p>
          <div className="flex gap-2">
            <Link href={`/login?callbackUrl=/invite/${token}`} className="flex-1">
              <Button variant="outline" className="w-full">
                Sign in
              </Button>
            </Link>
            <Link href={`/register?invite=${token}&email=${encodeURIComponent(invite.email)}`} className="flex-1">
              <Button className="w-full">Create account</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}