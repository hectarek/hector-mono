"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { type FormEvent, useActionState, useTransition } from "react";
import { renameSpace } from "@/app/actions/spaces";

// A book's or plan's name, for its owner: on Members, and as a step in its ⋯ (D83). A name
// chosen here stays, even when it was the one made from the owner's.
export function RenameSpaceForm({
  spaceId,
  name,
}: {
  spaceId: string;
  name: string;
}) {
  const [state, formAction, isPending] = useActionState(renameSpace, null);
  const [, startTransition] = useTransition();

  // Through a transition, not <form action>, so a refused name stays in the box to fix.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <input type="hidden" name="spaceId" value={spaceId} />
      <div className="flex gap-2">
        <Input
          name="name"
          defaultValue={name}
          aria-label="Name"
          required
          maxLength={80}
          className="h-9"
        />
        <Button
          type="submit"
          variant="secondary"
          size="lg"
          disabled={isPending}
        >
          {isPending ? "Saving…" : "Rename"}
        </Button>
      </div>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p className="text-muted-foreground text-sm">{state.message}</p>
      )}
    </form>
  );
}
