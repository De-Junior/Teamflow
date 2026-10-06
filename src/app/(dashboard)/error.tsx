"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Catches anything a dashboard page throws, so one failure doesn't blank the whole app. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle aria-hidden className="size-5 text-destructive" />
      </span>
      <h1 className="text-lg font-semibold text-foreground">This page didn&apos;t load</h1>
      <p className="text-sm text-muted-foreground">
        Something went wrong on our side. Your data is safe; try again in a moment.
      </p>
      {error.digest && <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
