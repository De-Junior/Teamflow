"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Status = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>(() => (token ? "verifying" : "error"));
  const [message, setMessage] = useState<string>(() => (token ? "" : "Missing verification token."));

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    fetch("/api/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) {
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(data.message ?? "Verification failed.");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });

    return () => {
      cancelled = true;
    };
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