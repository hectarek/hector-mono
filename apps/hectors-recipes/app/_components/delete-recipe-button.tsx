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
import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { useClosesWhenHidden } from "@/app/_lib/use-closes-when-hidden";
import { deleteRecipe } from "@/app/actions/recipes";

export function DeleteRecipeButton({
  recipeId,
  title,
}: {
  recipeId: string;
  title: string;
}) {
  const [state, formAction, isPending] = useActionState(deleteRecipe, null);
  const [open, setOpen] = useState(false);
  useClosesWhenHidden(() => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="lg" />}>
        <Trash2 data-icon="inline-start" />
        Delete recipe
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this recipe?</DialogTitle>
          <DialogDescription>
            &ldquo;{title}&rdquo; will be removed from the book for everyone who
            shares it. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        {state?.error && (
          <p className="text-destructive text-sm">{state.error}</p>
        )}
        <form action={formAction}>
          <input type="hidden" name="recipeId" value={recipeId} />
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
