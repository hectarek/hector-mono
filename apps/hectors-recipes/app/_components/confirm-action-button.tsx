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
import { useState } from "react";
import { ActionForm } from "@/app/_components/action-form";
import { useClosesOnLeave } from "@/app/_lib/use-closes-on-leave";
import type { ActionState } from "@/app/actions/shared";

// A button whose action asks first (Remove, Leave, Turn off; docs/ux-map.md), in the same
// confirmation dialog as deleting a recipe or a space: Cancel, or the action named again.
export function ConfirmActionButton({
  label,
  title,
  description,
  action,
  fields,
  className,
}: {
  label: string;
  title: string;
  description: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  // Layout only: where the button sits in its row.
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogKey = useClosesOnLeave(() => setOpen(false));

  return (
    <Dialog key={dialogKey} open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="secondary" size="lg" className={className} />}
      >
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ActionForm action={action} fields={fields}>
          {({ isPending }) => (
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
                {label}
              </Button>
            </DialogFooter>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
