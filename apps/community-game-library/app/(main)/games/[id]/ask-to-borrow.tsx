"use client";

import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Textarea } from "@repo/ui/components/textarea";
import { useState, useTransition } from "react";
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

// Borrow on a friend's available copy (B5, B13), and the sheet it opens (C1): the copy, a note to
// its owner, and Send request. The game's page then shows the copy as "You asked". Something that
// changed meanwhile, such as a yes to someone else, shows in the sheet and sends nothing (KTD16).
export function AskToBorrow({
  userGameId,
  title,
  color,
  imageUrl,
  owner,
  summary,
}: {
  userGameId: string;
  title: string;
  color: CoverColor;
  imageUrl: string | null;
  owner: NameAndPiece;
  // The copy's condition and box in one line (copySummary).
  summary: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [state, setState] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();

  const openSheet = (next: boolean) => {
    setOpen(next);
    if (next) {
      setState(null);
    }
  };
  const send = () =>
    startTransition(async () => {
      const result = await callResultAction(() =>
        requestLoan(userGameId, note, owner.name),
      );
      if (result && "message" in result && result.message) {
        setOpen(false);
        setNote("");
        notify(result.message);
        return;
      }
      setState(result && "ok" in result ? { error: result.error } : result);
    });

  return (
    <>
      <Button size="sm" onClick={() => openSheet(true)}>
        Borrow
      </Button>
      <Sheet open={open} onOpenChange={openSheet} title="Ask to borrow">
        <div className="flex items-center gap-3">
          <CoverThumb color={color} imageUrl={imageUrl} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-15 font-bold">{title}</span>
            <span className="flex items-center gap-1.25 text-xs">
              <Piece
                shape={owner.pieceShape}
                color={owner.pieceColor}
                size={11}
              />
              {owner.name}’s copy · available
            </span>
            <span className="font-mono text-2xs font-medium text-muted-foreground">
              {summary}
            </span>
          </div>
        </div>
        {state?.changed ? (
          <ChangedNotice reason={state.changed} />
        ) : (
          <form
            className="flex flex-col gap-3.5"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <Field data-invalid={state?.fields?.note ? "true" : undefined}>
              <FieldLabel htmlFor="borrow-note">
                <span>
                  Note for {owner.name}
                  <span data-ink="smudge" className="font-normal">
                    {" · optional"}
                  </span>
                </span>
              </FieldLabel>
              <Textarea
                id="borrow-note"
                name="note"
                rows={2}
                maxLength={500}
                placeholder="Can I grab it Friday?"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              {state?.fields?.note && (
                <FieldError>{state.fields.note}</FieldError>
              )}
            </Field>
            <p className="text-13 leading-snug text-muted-foreground">
              {owner.name} picks how long you can keep it. The clock starts the
              day you pick it up.
            </p>
            {state?.error && !state.fields && (
              <p role="alert" className="text-xs text-destructive">
                {state.error}
              </p>
            )}
            <SheetActions>
              <Button type="submit" size="lg" disabled={pending}>
                Send request
              </Button>
            </SheetActions>
          </form>
        )}
      </Sheet>
    </>
  );
}
