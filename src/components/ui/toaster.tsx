"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/components/providers/theme-provider";

/** App-wide toasts. Call `toast.success(...)` / `toast.error(...)` from "sonner". */
export function Toaster() {
  const { theme } = useTheme();
  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: "!bg-card !text-card-foreground !border-border !shadow-lg",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}
