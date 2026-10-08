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
import { useActionState, useState } from "react";
import { useClosesOnLeave } from "@/app/_lib/use-closes-on-leave";
import { deleteSpace } from "@/app/actions/spaces";

export function DeleteSpaceButton({
  spaceId,
  name,
  typeLabel,
  contents,
}: {
  spaceId: string;
  name: string;
  typeLabel: string;
  // What goes with it, in a sentence ("meal plan (with its grocery list)").
  contents: string;
}) {
  const [state, formAction, isPending] = useActionState(deleteSpace, null);
  const [open, setOpen] = useState(false);
  const dialogKey = useClosesOnLeave(() => setOpen(false));

  return (
    <Dialog key={dialogKey} open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="lg" />}>
        Delete {typeLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{name}&rdquo;?</DialogTitle>
          <DialogDescription>
            This deletes the {contents} and everything in it for everyone who
            shares it. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        {state?.error && (
          <p className="text-destructive text-sm">{state.error}</p>
        )}
        <form action={formAction}>
          <input type="hidden" name="spaceId" value={spaceId} />
          <DialogFooter>
            <DialogClose
              render={<Button variant="secondary" size="lg" type="button" />}
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              size="lg"
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
