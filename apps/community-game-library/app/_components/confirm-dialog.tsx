"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { type ReactNode, useRef, useState } from "react";
import { useLeaveRequest } from "@/app/_lib/leave-guard";
import { useClosesOnLeave } from "@/app/_lib/use-closes-on-leave";

// Asks before anything is lost or can't be undone (KTD17, screens.md rule 3 and Actions that ask
// first): the question as its title, then who is told and what happens, and two buttons side by
// side. The red one names the thing ("Call it back"); the other says what's kept ("Leave it with
// Jo"), never "Not now" or a bare "Cancel", and has the cursor when it opens, so a stray Enter
// keeps things as they are. No close button and no third choice. When the two labels don't fit
// side by side, each takes its own row, the red one first, as E9 draws them. `onConfirm` runs the
// action and answers with its error, if any; the dialog stays open to show it, and closes once
// it's done.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  keepLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  // Who is told, and what happens ("Sam is told.", "This can't be undone.").
  children?: ReactNode;
  confirmLabel: string;
  keepLabel: string;
  onConfirm: () => Promise<string | undefined> | string | undefined;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const keep = useRef<HTMLButtonElement>(null);
  const dialogKey = useClosesOnLeave(() => {
    if (open) onOpenChange(false);
  });

  const change = (next: boolean) => {
    if (!next) setError(undefined);
    onOpenChange(next);
  };

  async function confirm() {
    setPending(true);
    setError(undefined);
    const failed = await onConfirm();
    setPending(false);
    if (failed) {
      setError(failed);
    } else {
      onOpenChange(false);
    }
  }

  return (
    <AlertDialog key={dialogKey} open={open} onOpenChange={change}>
      <AlertDialogContent initialFocus={keep}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {children && (
            <AlertDialogDescription render={<div />}>
              <div className="flex flex-col gap-3.5">{children}</div>
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-xs font-semibold text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="min-w-fit flex-1"
            disabled={pending}
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
          <AlertDialogCancel
            ref={keep}
            variant="secondary"
            size="lg"
            className="min-w-fit flex-1"
          >
            {keepLabel}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// "Leave without saving?": the one dialog the back link and the tabs ask through while a form
// has typed text (app/_lib/leave-guard.ts), in the signed-in layout.
export function LeaveGuardDialog() {
  const { asking, leave, stay } = useLeaveRequest();
  return (
    <ConfirmDialog
      open={asking}
      onOpenChange={(open) => {
        if (!open) stay();
      }}
      title="Leave without saving?"
      confirmLabel="Leave"
      keepLabel="Keep editing"
      onConfirm={() => {
        leave();
        return undefined;
      }}
    />
  );
}
