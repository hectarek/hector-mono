"use client";

import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Group } from "@/app/_components/group";
import { Piece } from "@/app/_components/piece";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { inviteToNight } from "@/app/actions/nights";
import { listed } from "@/src/entities/listed";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

// Invite people's Not invited yet (D10, R30): the inviter's friends not on the list, each ticked
// or not, with Invite all my friends; a full night says the people invited join the waitlist
// after whoever's last on it. Send goes back to the night, where each shows as Invited until they
// answer (screens.md, Send invitations). Each box's label sits beside it, as on D6.
export function InviteForm({
  gameNightId,
  friends,
  full,
  lastWaiting,
}: {
  gameNightId: string;
  friends: readonly NameAndPiece[];
  full: boolean;
  // Who's last on the waitlist now, for the full night's line.
  lastWaiting: string | null;
}) {
  const router = useRouter();
  const [ticked, setTicked] = useState<readonly string[]>([]);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const chosen = friends.filter((one) => ticked.includes(one.userId));

  const send = () =>
    startTransition(async () => {
      const result = await callResultAction(() =>
        inviteToNight(
          gameNightId,
          chosen.map(({ userId, name }) => ({ userId, name })),
        ),
      );
      if (result && "message" in result && result.message) {
        router.push(`/nights/${gameNightId}`);
        notify(result.message);
        return;
      }
      setError(result?.error);
    });

  if (friends.length === 0) {
    return (
      <Group label="Not invited yet">
        <p className="text-13 text-muted-foreground">
          All your friends are on the list.
        </p>
      </Group>
    );
  }

  return (
    <Group label="Not invited yet">
      <ul className="flex flex-col *:border-dashed *:border-foreground *:not-first:border-t-2">
        {friends.map((one) => (
          <li key={one.userId} className="flex items-center gap-3 py-2">
            <Checkbox
              id={`invite-${one.userId}`}
              checked={ticked.includes(one.userId)}
              onCheckedChange={(on) =>
                setTicked((now) =>
                  on
                    ? [...now, one.userId]
                    : now.filter((id) => id !== one.userId),
                )
              }
            />
            <label
              htmlFor={`invite-${one.userId}`}
              className="flex min-h-11 flex-1 items-center gap-3 text-15 font-bold"
            >
              <Piece shape={one.pieceShape} color={one.pieceColor} size={20} />
              {one.name}
            </label>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="link"
        className="self-start"
        onClick={() => setTicked(friends.map((one) => one.userId))}
      >
        Invite all my friends
      </Button>
      <div className="flex flex-col gap-2.5 border-t-2 border-dashed border-foreground pt-3">
        {full && chosen.length > 0 && (
          <p className="text-13 text-muted-foreground">
            The night is full, so {listed(chosen.map((one) => one.name))}{" "}
            {chosen.length === 1 ? "joins" : "join"} the waitlist
            {lastWaiting ? ` after ${lastWaiting}` : ""}.
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <Button
          size="lg"
          disabled={pending || chosen.length === 0}
          onClick={send}
        >
          {chosen.length === 1
            ? "Send 1 invite"
            : `Send ${chosen.length} invites`}
        </Button>
      </div>
    </Group>
  );
}

// Or share the link (D10): the link alone, on the clipboard.
export function CopyNightLink({ url }: { url: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      notify("Link copied");
    } catch {
      notify("That didn’t copy. Try again.");
    }
  }
  return (
    <Button type="button" variant="secondary" onClick={copy}>
      Copy link
    </Button>
  );
}
