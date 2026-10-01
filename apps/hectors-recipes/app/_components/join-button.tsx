"use client";

import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@repo/ui/components/field";
import { useActionState, useId } from "react";
import { acceptInvite } from "@/app/actions/spaces";

export function JoinButton({
  token,
  label,
  askDefault,
}: {
  token: string;
  label: string;
  // Joining a plan while their own is in use: ask whether this one becomes their default.
  askDefault: boolean;
}) {
  const [state, formAction, isPending] = useActionState(acceptInvite, null);
  const id = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      {askDefault && (
        <FieldLabel htmlFor={id}>
          <Field orientation="horizontal">
            <Checkbox id={id} name="makeDefault" defaultChecked />
            <FieldContent>
              <FieldTitle>Make it my default plan</FieldTitle>
              <FieldDescription>
                Plan and Groceries open to it. Your own plan stays one tap away.
              </FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
      )}
      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Joining…" : label}
      </Button>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}
