"use client";

import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { callAction } from "@/app/_lib/call-action";
import type { ActionResult } from "@/app/actions/shared";

// Deleting something, which asks first: deleting is Hector's alone (R21), and the server refuses
// anyone else. Deleted, it goes to `then`, or stays when the page still stands.
export function DeleteButton({
  what,
  action,
  then,
}: {
  // What's deleted, as the question names it: a company's name, a job's role, "this note".
  what: string;
  action: () => Promise<ActionResult<unknown>>;
  then?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await callAction(action);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      if (then) {
        router.push(then);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="destructive" size="lg" className="min-h-11" />}
      >
        Delete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {what}?</DialogTitle>
          <DialogDescription>
            It can&apos;t be undone. Its history stays in the log.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose
            render={
              <Button
                variant="secondary"
                size="lg"
                type="button"
                className="min-h-11"
              />
            }
          >
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            size="lg"
            disabled={isPending}
            onClick={confirm}
            className="min-h-11"
          >
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
