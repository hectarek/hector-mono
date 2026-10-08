"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { type FormEvent, useActionState, useTransition } from "react";
import { createBook } from "@/app/actions/spaces";

export function NewBookForm() {
  const [state, formAction, isPending] = useActionState(createBook, null);
  const [, startTransition] = useTransition();

  // Through a transition, not <form action>, so a refused name stays in the box to fix (a
  // form action resets it). A created book opens, so there's nothing to clear.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          name="name"
          placeholder="New book name, e.g. Home"
          aria-label="New book name"
          required
          maxLength={80}
          className="h-9"
        />
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Creating…" : "Create"}
        </Button>
      </div>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}
