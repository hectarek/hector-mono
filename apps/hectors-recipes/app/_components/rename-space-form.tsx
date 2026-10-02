"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { useActionState } from "react";
import { renameSpace } from "@/app/actions/spaces";

export function RenameSpaceForm({
  spaceId,
  name,
}: {
  spaceId: string;
  name: string;
}) {
  const [state, formAction, isPending] = useActionState(renameSpace, null);

  return (
    <form action={formAction} className="flex flex-col gap-1">
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
        <p className="text-destructive text-sm">{state.error}</p>
      )}
      {state?.message && (
        <p className="text-muted-foreground text-sm">{state.message}</p>
      )}
    </form>
  );
}
