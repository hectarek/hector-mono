"use client";

import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { startTransition, useActionState, useId, useState } from "react";
import { setDefaultSpace } from "@/app/actions/spaces";

// What the Recipes tab opens to: a book, or All recipes (no default book). Saves on change.
export function DefaultBookPicker({
  books,
  defaultId,
}: {
  books: { id: string; name: string }[];
  defaultId: string | undefined;
}) {
  const [state, formAction, isPending] = useActionState(setDefaultSpace, null);
  const [value, setValue] = useState(defaultId ?? "");
  const id = useId();

  function choose(next: string) {
    setValue(next);
    const formData = new FormData();
    formData.set("type", "recipe-book");
    formData.set("spaceId", next);
    startTransition(() => formAction(formData));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        Default book
      </label>
      <NativeSelect
        className="w-full"
        id={id}
        value={value}
        onChange={(event) => choose(event.target.value)}
      >
        <NativeSelectOption value="">All recipes</NativeSelectOption>
        {books.map((book) => (
          <NativeSelectOption key={book.id} value={book.id}>
            {book.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <p
        role={state?.error ? "alert" : undefined}
        className={
          state?.error
            ? "text-destructive text-sm"
            : "text-muted-foreground text-sm"
        }
      >
        {state?.error ??
          (isPending
            ? "Saving…"
            : "What the Recipes tab shows when you open it.")}
      </p>
    </div>
  );
}
