"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { useActionState } from "react";
import { addItem } from "@/app/actions/stash-items";

export function AddItemForm() {
  const [state, formAction, isPending] = useActionState(addItem, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="url"
          type="url"
          placeholder="Paste a link..."
          required
          className="flex-1"
        />
        <Input
          name="title"
          type="text"
          placeholder="Title"
          required
          className="flex-1"
        />
      </div>
      <Button
        type="submit"
        disabled={isPending}
        className="w-full sm:w-auto sm:self-end"
      >
        {isPending ? "Adding..." : "Add to Stash"}
      </Button>
      {state?.error && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}
    </form>
  );
}
