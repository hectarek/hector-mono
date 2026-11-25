"use client";

import { Button } from "@repo/ui/components/button";
import { useTransition } from "react";
import { ListItem, RowName } from "@/app/_components/list-row";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import {
  answerFriendRequest,
  cancelFriendRequest,
  sendFriendRequest,
} from "@/app/actions/friends";
import type { ActionState } from "@/app/actions/shared";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

// A person on Friends (E1) or step 2 of setting up (A5), with what you can do about them right
// there: a request to you (Accept, Decline), your request (You asked, Cancel request), or someone
// you may know (Add friend). Each says what it did in a message; the list moves the row once the
// page is refreshed by the action.
export function FriendRow({
  person,
  via,
  night = null,
  request,
}: {
  person: NameAndPiece;
  // A friend you share: "Friend of Alice".
  via: NameAndPiece | null;
  // Or the last night you were at together: "At Halloween one-shots" (U19).
  night?: string | null;
  // Theirs to you, yours to them, or none yet.
  request:
    | { kind: "to-you"; id: string }
    | { kind: "yours"; id: string }
    | { kind: "none" };
}) {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionState>) {
    startTransition(async () => {
      const result = await callResultAction(action);
      const line =
        result?.error ??
        (result && "message" in result ? result.message : undefined);
      if (line) notify(line);
    });
  }

  return (
    <ListItem>
      <Piece shape={person.pieceShape} color={person.pieceColor} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <RowName>{person.name}</RowName>
        {via ? (
          <span className="text-xs text-muted-foreground">
            Friend of {via.name}
          </span>
        ) : (
          night && (
            <span className="text-xs text-muted-foreground">At {night}</span>
          )
        )}
      </span>
      {request.kind === "to-you" && (
        <>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              run(() => answerFriendRequest(request.id, "accept", person.name))
            }
          >
            Accept
          </Button>
          <Button
            variant="link"
            disabled={pending}
            onClick={() =>
              run(() => answerFriendRequest(request.id, "decline", person.name))
            }
          >
            Decline
          </Button>
        </>
      )}
      {request.kind === "yours" && (
        <>
          <Stamp tone="brown">You asked</Stamp>
          <Button
            variant="link"
            disabled={pending}
            onClick={() =>
              run(() => cancelFriendRequest(request.id, person.name))
            }
          >
            Cancel request
          </Button>
        </>
      )}
      {request.kind === "none" && (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => sendFriendRequest(person.userId, person.name))
          }
        >
          Add friend
        </Button>
      )}
    </ListItem>
  );
}
