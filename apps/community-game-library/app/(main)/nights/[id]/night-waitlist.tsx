"use client";

import { Button } from "@repo/ui/components/button";
import { useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { List, ListItem } from "@/app/_components/list-row";
import { Piece } from "@/app/_components/piece";
import { callAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { removeFromWaitlist } from "@/app/actions/nights";
import { ordinal } from "@/src/entities/loan";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

type Waiting = NameAndPiece & { guestCount: number };

// The waitlist on the host's page (D7, R31): each person in order, the seats they need, and
// Remove from waitlist, which asks first and tells them.
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
          <ListItem key={one.userId}>
            <Piece shape={one.pieceShape} color={one.pieceColor} size={20} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-15 font-bold">{one.name}</span>
              <span className="text-xs text-muted-foreground">
                {ordinal(index + 1)} on the waitlist · needs{" "}
                {1 + one.guestCount} {one.guestCount === 0 ? "seat" : "seats"}
              </span>
            </span>
            <Button
              type="button"
              variant="link"
              onClick={() => setRemoving(one)}
            >
              Remove from waitlist
            </Button>
          </ListItem>
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
