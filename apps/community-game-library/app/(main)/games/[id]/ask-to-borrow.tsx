"use client";

import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Textarea } from "@repo/ui/components/textarea";
import { type ReactNode, useState, useTransition } from "react";
import { ChangedNotice } from "@/app/_components/changed-notice";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { Piece } from "@/app/_components/piece";
import { Sheet, SheetActions } from "@/app/_components/sheet";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { requestLoan } from "@/app/actions/loans";
import type { ActionState } from "@/app/actions/shared";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import type { CoverColor } from "@/src/entities/piece";

// A friend's copy, as Ask to borrow and Join the line show it (C1, C10).
export type CopyToAsk = {
  userGameId: string;
  title: string;
  color: CoverColor;
  imageUrl: string | null;
  owner: NameAndPiece;
  // The copy's condition and box in one line (copySummary).
  summary: string;
};

// The copy at the top of C1 and C10: its cover, its title, and the owner's copy with what it's
// like or where it is.
export function CopyHeader({
  copy,
  where,
  facts,
}: {
  copy: CopyToAsk;
  where: string;
  facts?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <CoverThumb color={copy.color} imageUrl={copy.imageUrl} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-15 font-bold">{copy.title}</span>
        <span className="flex items-center gap-1.25 text-xs">
          <Piece
            shape={copy.owner.pieceShape}
            color={copy.owner.pieceColor}
            size={11}
          />
          {copy.owner.name}’s copy · {where}
        </span>
        {facts && (
          <span className="font-mono text-2xs font-medium text-muted-foreground">
            {facts}
          </span>
        )}
      </div>
    </div>
  );
}

// A note to the copy's owner and the sheet's one action (C1, C10): what the sheet sends, with the
// note, which may be left empty. Something that changed meanwhile, such as a yes to someone else,
// shows in place of the form and sends nothing (KTD16); for C1, its next step joins the line with
// the same note.
export function RequestForm({
  copy,
  join,
  submitLabel,
  children,
  onSent,
}: {
  copy: CopyToAsk;
  join: boolean;
  submitLabel: string;
  // What the owner does next, between the note and the button.
  children?: ReactNode;
  onSent: () => void;
}) {
  const [note, setNote] = useState("");
  const [state, setState] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();
  const noteId = `${join ? "line" : "borrow"}-note-${copy.userGameId}`;

  const send = (joining: boolean) =>
    startTransition(async () => {
      const result = await callResultAction(() =>
        requestLoan(copy.userGameId, note, copy.owner.name, joining),
      );
      if (result && "message" in result && result.message) {
        setNote("");
        setState(null);
        onSent();
        notify(result.message);
        return;
      }
      setState(result && "ok" in result ? { error: result.error } : result);
    });

  if (state?.changed) {
    return (
      <ChangedNotice
        reason={state.changed}
        onNext={
          state.changed === "copy-lent" && !join && !pending
            ? () => send(true)
            : undefined
        }
      />
    );
  }
  return (
    <form
      className="flex flex-col gap-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        send(join);
      }}
    >
      <Field data-invalid={state?.fields?.note ? "true" : undefined}>
        <FieldLabel htmlFor={noteId}>
          <span>
            Note for {copy.owner.name}
            <span data-ink="smudge" className="font-normal">
              {" · optional"}
            </span>
          </span>
        </FieldLabel>
        <Textarea
          id={noteId}
          name="note"
          // Three lines for C1's request, two for C10's, as their boards draw them.
          rows={join ? 2 : 3}
          maxLength={500}
          placeholder={join ? undefined : "Can I grab it Friday?"}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        {state?.fields?.note && <FieldError>{state.fields.note}</FieldError>}
      </Field>
      {children}
      {state?.error && !state.fields && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
      <SheetActions>
        <Button type="submit" size="lg" disabled={pending}>
          {submitLabel}
        </Button>
      </SheetActions>
    </form>
  );
}

// C1's body: the copy, a note to its owner, and Send request. The game's page then shows the copy
// as "You asked".
export function BorrowRequest({
  copy,
  onSent,
}: {
  copy: CopyToAsk;
  onSent: () => void;
}) {
  return (
    <>
      <CopyHeader copy={copy} where="available" facts={copy.summary} />
      <RequestForm
        copy={copy}
        join={false}
        submitLabel="Send request"
        onSent={onSent}
      >
        <p className="text-13 leading-snug text-muted-foreground">
          {copy.owner.name} picks how long you can keep it. The clock starts the
          day you pick it up.
        </p>
      </RequestForm>
    </>
  );
}

// Borrow on a friend's available copy (B5, B13), and the sheet it opens (C1).
export function AskToBorrow({ copy }: { copy: CopyToAsk }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Borrow
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title="Ask to borrow">
        <BorrowRequest copy={copy} onSent={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
