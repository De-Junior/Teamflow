"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";

/** Signs straight into the seeded demo workspace, no sign-up needed. */
export function DemoSignInButton({
  label = "Try the live demo",
  fullWidth = false,
  ...props
}: { label?: string; fullWidth?: boolean } & Omit<ButtonProps, "onClick">) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function enterDemo() {
    setState("loading");
    try {
      const result = await signIn("credentials", {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        redirect: false,
      });
      if (result?.error) throw new Error(result.error);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <div className={fullWidth ? "flex flex-col gap-1.5" : "flex flex-col items-center gap-1.5 sm:items-start"}>
      <Button {...props} onClick={enterDemo} disabled={state === "loading" || props.disabled}>
        {state === "loading" ? "Opening the demo…" : label}
        {state !== "loading" && <ArrowRight />}
      </Button>
      {state === "error" && (
        <p className="text-xs text-destructive">
          The demo workspace isn&apos;t available right now. Please sign up instead.
        </p>
      )}
    </div>
  );
}
