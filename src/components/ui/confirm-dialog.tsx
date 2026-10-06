"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  destructive?: boolean;
};

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * `const confirm = useConfirm(); if (!(await confirm({ title }))) return;`
 * An accessible replacement for window.confirm: focus is trapped, Escape
 * cancels, and focus returns to the trigger afterwards.
 */
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>((next) => {
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function settle(value: boolean) {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={options !== null} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-lg">
            <AlertDialog.Title className="text-base font-semibold text-foreground">{options?.title}</AlertDialog.Title>
            {options?.description ? (
              <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                {options.description}
              </AlertDialog.Description>
            ) : (
              <AlertDialog.Description className="sr-only">Confirm this action.</AlertDialog.Description>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialog.Cancel asChild>
                <Button variant="outline">{options?.cancelLabel ?? "Cancel"}</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button variant={options?.destructive ? "destructive" : "default"} onClick={() => settle(true)}>
                  {options?.confirmLabel ?? "Confirm"}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}
