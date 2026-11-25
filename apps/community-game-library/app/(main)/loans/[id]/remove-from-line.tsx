"use client";

import { Button } from "@repo/ui/components/button";
import { Field, FieldLabel } from "@repo/ui/components/field";
import { Textarea } from "@repo/ui/components/textarea";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { removeFromLine } from "@/app/actions/loans";

// The owner's Remove from line (C7's The line, and the request's own page), after "Take Ben out of
// the line?" with an optional note for Ben (screens.md, Actions that ask first). Ben is told, with
// the note. From the request's page, Loans opens.
export function RemoveFromLine({
  loanId,
  name,
  thenOpen,
}: {
  loanId: string;
  // The person in line.
  name: string;
  thenOpen?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const noteId = `remove-note-${loanId}`;

  async function confirm() {
    const result = await callResultAction(() =>
      removeFromLine(loanId, note, name),
    );
    if (result?.error !== undefined) {
      return result.error;
    }
    setNote("");
    if (thenOpen) {
      router.push(thenOpen);
    }
    if (result && "message" in result && result.message) {
      notify(result.message);
    }
    return undefined;
  }

  return (
    <>
      <Button
        variant={thenOpen ? "secondary" : "link"}
        // A quiet link keeps its own 4px sides: a small size would give it a row button's 14px.
        size={thenOpen ? "lg" : "default"}
        className={thenOpen ? "w-full" : undefined}
        onClick={() => setOpen(true)}
      >
        Remove from line
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Take ${name} out of the line?`}
        confirmLabel={`Remove ${name}`}
        keepLabel={`Keep ${name}`}
        onConfirm={confirm}
      >
        <p>{name} is told. A note is optional.</p>
        <Field>
          <FieldLabel htmlFor={noteId}>
            <span>
              Note for {name}
              <span data-ink="smudge" className="font-normal">
                {" · optional"}
              </span>
            </span>
          </FieldLabel>
          <Textarea
            id={noteId}
            rows={2}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
      </ConfirmDialog>
    </>
  );
}
