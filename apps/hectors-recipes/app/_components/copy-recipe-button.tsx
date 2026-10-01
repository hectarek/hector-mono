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
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { Copy } from "lucide-react";
import { useActionState } from "react";
import { adoptRecipes } from "@/app/actions/spaces";

type Target = { id: string; name: string };

export function BookSelect({ targets }: { targets: Target[] }) {
  return (
    <NativeSelect
      name="targetSpaceId"
      required
      aria-label="Copy into"
      className="w-full"
    >
      {targets.map((target) => (
        <NativeSelectOption key={target.id} value={target.id}>
          {target.name}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

export function CopyRecipeButton({
  recipeId,
  title,
  targets,
}: {
  recipeId: string;
  title: string;
  targets: Target[];
}) {
  const [state, formAction, isPending] = useActionState(adoptRecipes, null);

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="secondary" size="lg" />}>
        <Copy data-icon="inline-start" />
        Copy
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy to another book</DialogTitle>
          <DialogDescription>
            &ldquo;{title}&rdquo; is copied as its own recipe. Later changes to
            either one won&apos;t affect the other.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="recipeId" value={recipeId} />
          <BookSelect targets={targets} />
          {state?.error && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" size="lg" type="button" />}
            >
              Cancel
            </DialogClose>
            <Button type="submit" size="lg" disabled={isPending}>
              {isPending ? "Copying…" : "Copy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
