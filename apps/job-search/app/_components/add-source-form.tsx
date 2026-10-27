"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { type FormEvent, useState, useTransition } from "react";
import { callAction } from "@/app/_lib/call-action";
import type { ActionResult } from "@/app/actions/shared";
import { addSource } from "@/app/actions/sources";
import type { AddedSource } from "@/src/entities/models/lead-source.model";

// Adds a lead source (R5). A name already listed, in any case, is that source: the form says so
// rather than adding another.
export function AddSourceForm() {
  const [name, setName] = useState("");
  const [result, setResult] = useState<ActionResult<AddedSource>>();
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const answer = await callAction(() => addSource({ name }));
      setResult(answer);
      if (answer.ok) {
        setName("");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="A job board, a referral, a recruiter"
          aria-label="New source's name"
          required
          maxLength={80}
          className="min-h-11"
        />
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="min-h-11"
        >
          Add
        </Button>
      </div>
      {result?.ok === false ? (
        <p role="alert" className="text-destructive text-sm">
          {result.message}
        </p>
      ) : null}
      {result?.ok && !result.data.created ? (
        <p role="status" className="text-muted-foreground text-sm">
          Already listed as {result.data.source.name}.
        </p>
      ) : null}
    </form>
  );
}
