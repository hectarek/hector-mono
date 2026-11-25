"use client";

import { Button } from "@repo/ui/components/button";
import { useState } from "react";
import { Piece } from "@/app/_components/piece";
import { Sheet } from "@/app/_components/sheet";
import { ordinal } from "@/src/entities/loan";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import {
  BorrowRequest,
  CopyHeader,
  type CopyToAsk,
  RequestForm,
} from "./ask-to-borrow";

// Join the line on a friend's copy that's out, promised or asked for (B5, B13), and the sheet it
// opens (C10): the copy and where it is, the order with the member's own piece at the end, dashed
// since the place is still to come ("Jo, then you"), what happens when it's their turn and how soon
// that can be, a copy of the same game that's available instead, when there is one, which turns
// the sheet into Ask to borrow (C1), and a note for the owner. The game's page then reads "2nd in
// line", with Leave the line.
export function JoinLine({
  copy,
  me,
  where,
  ahead,
  turn,
  earliest,
  instead,
}: {
  copy: CopyToAsk;
  // The member's own name and piece.
  me: NameAndPiece;
  // "Ben has it until Nov 20".
  where: string;
  // The people in line now, in order.
  ahead: readonly NameAndPiece[];
  // What happens when it's their turn: the owner is asked, or the copy is passed along.
  turn: string;
  // "Earliest: after Ben's loan ends Nov 20, and Jo's turn."
  earliest: string | null;
  instead: CopyToAsk | null;
}) {
  const [open, setOpen] = useState(false);
  const [borrowing, setBorrowing] = useState(false);
  const change = (next: boolean) => {
    setOpen(next);
    if (next) {
      setBorrowing(false);
    }
  };
  const order =
    ahead.length === 0
      ? "You’re first"
      : `${ahead.map((person) => person.name).join(", ")}, then you`;

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => change(true)}>
        Join the line
      </Button>
      <Sheet
        open={open}
        onOpenChange={change}
        title={borrowing ? "Ask to borrow" : "Join the line"}
      >
        {borrowing && instead ? (
          <BorrowRequest copy={instead} onSent={() => setOpen(false)} />
        ) : (
          <>
            <CopyHeader copy={copy} where={where} />
            <div className="flex flex-col gap-2 rounded-lg border-2 border-foreground bg-secondary px-3.5 py-3">
              <ol className="flex flex-wrap items-end gap-5.5">
                {ahead.map((person, index) => (
                  <li
                    key={person.userId}
                    className="flex flex-col items-center gap-1"
                  >
                    <Piece
                      shape={person.pieceShape}
                      color={person.pieceColor}
                      size={24}
                    />
                    <span className="font-mono text-2xs font-medium">
                      {ordinal(index + 1)}
                      <span className="sr-only">, {person.name}</span>
                    </span>
                  </li>
                ))}
                <li className="flex flex-col items-center gap-1">
                  <Piece
                    shape={me.pieceShape}
                    color={me.pieceColor}
                    size={24}
                    dashed
                  />
                  <span className="font-mono text-2xs font-medium">
                    You, {ordinal(ahead.length + 1)}
                  </span>
                </li>
              </ol>
              <p className="text-13 text-muted-foreground">{order}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-13 leading-snug text-muted-foreground">
                {earliest ? `${turn} ${earliest}` : turn}
              </p>
              {instead && (
                <Button
                  variant="link"
                  className="self-start"
                  onClick={() => setBorrowing(true)}
                >
                  {instead.owner.name}’s copy is available. Borrow that instead
                </Button>
              )}
            </div>
            <RequestForm
              copy={copy}
              join
              submitLabel="Join the line"
              onSent={() => setOpen(false)}
            />
          </>
        )}
      </Sheet>
    </>
  );
}
