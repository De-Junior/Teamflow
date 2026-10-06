"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Status = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>(() => (token ? "verifying" : "error"));
  const [message, setMessage] = useState<string>(() => (token ? "" : "Missing verification token."));

  // Tokens are single-use, so make sure the request is only ever sent once
  // (React runs effects twice in development).
  const sent = useRef(false);
  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;

    api.post("/api/verify-email", { token }).then(
      () => setStatus("success"),
      (err) => {
        setStatus("error");
        setMessage(errorMessage(err));
      }
    );
  }, [token]);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {status === "verifying" && <p className="text-sm text-muted-foreground">Verifying your email…</p>}

      {status === "success" && (
        <>
          <h1 className="text-xl font-semibold">Email verified</h1>
          <p className="text-sm text-muted-foreground">Your email has been verified. You&apos;re all set.</p>
          <Link href="/dashboard" className="text-sm font-medium text-primary underline">
            Go to dashboard
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="text-xl font-semibold">Verification failed</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Link href="/dashboard" className="text-sm font-medium text-primary underline">
            Go to dashboard
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}