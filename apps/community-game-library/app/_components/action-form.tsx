"use client";

import { cn } from "@repo/ui/lib/utils";
import { type ReactNode, useActionState } from "react";
import type { ActionState } from "@/app/actions/shared";

type ServerAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

// A small form around one server action: hidden fields, pending state, inline error.
export function ActionForm({
  action,
  fields,
  children,
  className,
}: {
  action: ServerAction;
  fields: Record<string, string>;
  children: (state: { isPending: boolean }) => ReactNode;
  className?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction} className={cn("flex flex-col gap-1", className)}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children({ isPending })}
      {state?.error && (
        <p role="alert" className="text-destructive text-xs">
          {state.error}
        </p>
      )}
    </form>
  );
}
