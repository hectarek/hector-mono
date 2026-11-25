"use client";

import { Button } from "@repo/ui/components/button";
import { useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { List } from "@/app/_components/list-row";
import { Piece } from "@/app/_components/piece";
import { callAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { removeFromWaitlist } from "@/app/actions/nights";
import { ordinal } from "@/src/entities/loan";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

type Waiting = NameAndPiece & { guestCount: number };

// The waitlist on the host's page (D7, R31): each person in order, the seats they need, and
// Remove from waitlist under that line, as D7 draws it, which asks first and tells them.
export function NightWaitlist({
  gameNightId,
  waitlist,
}: {
  gameNightId: string;
  waitlist: readonly Waiting[];
}) {
  const [removing, setRemoving] = useState<Waiting | null>(null);
  return (
    <>
      <List>
        {waitlist.map((one, index) => (
          <li
            key={one.userId}
            className="flex items-start gap-3 px-3 pt-2.5 pb-0.5"
          >
            <Piece shape={one.pieceShape} color={one.pieceColor} size={20} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-15 font-bold">{one.name}</span>
              <span className="text-xs text-muted-foreground">
                {ordinal(index + 1)} on the waitlist · needs{" "}
                {1 + one.guestCount} {one.guestCount === 0 ? "seat" : "seats"}
              </span>
              <Button
                type="button"
                variant="link"
                className="self-start"
                onClick={() => setRemoving(one)}
              >
                Remove from waitlist
              </Button>
            </span>
          </li>
        ))}
      </List>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title={`Take ${removing?.name ?? ""} off the waitlist?`}
        confirmLabel={`Remove ${removing?.name ?? ""}`}
        keepLabel={`Keep ${removing?.name ?? ""}`}
        onConfirm={async () => {
          if (!removing) return undefined;
          const { name, userId } = removing;
          const error = await callAction(() =>
            removeFromWaitlist(gameNightId, userId, name),
          );
          if (!error) {
            notify(`${name} is off the waitlist. ${name} is told.`);
          }
          return error;
        }}
      >
        {removing?.name} is told.
      </ConfirmDialog>
    </>
  );
}
