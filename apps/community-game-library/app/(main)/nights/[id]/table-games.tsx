"use client";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import Link from "next/link";
import { useState, useTransition } from "react";
import { DicePair } from "@/app/_components/dice";
import { Group } from "@/app/_components/group";
import { Piece } from "@/app/_components/piece";
import { callAction, callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { bringGames, voteOnGame } from "@/app/actions/nights";
import type { DI_RETURN_TYPES } from "@/di/types";
import { tableLine } from "@/src/entities/game-facts";
import { type NightGameChoices, PickGamesSheet } from "../pick-games-sheet";

type Night = Awaited<ReturnType<DI_RETURN_TYPES["IGetNightController"]>>;

// I'd play, pressed or not (R38): it reads "You'd play" once pressed, and goes back with what
// went wrong when the vote doesn't save. At least 100px wide, so the two words line up down the
// table (D7).
function IdPlay({
  gameNightId,
  userGameId,
  pressed,
}: {
  gameNightId: string;
  userGameId: string;
  pressed: boolean;
}) {
  const [on, setOn] = useState(pressed);
  const [, startTransition] = useTransition();
  const flip = () => {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const error = await callAction(() =>
        voteOnGame(gameNightId, userGameId, next),
      );
      if (error) {
        setOn(!next);
        notify(error);
      }
    });
  };
  return (
    <Button
      type="button"
      size="sm"
      variant={on ? "default" : "secondary"}
      className="min-w-25"
      aria-pressed={on}
      onClick={flip}
    >
      {on ? "You’d play" : "I’d play"}
    </Button>
  );
}

// The games on the table (D2, D7, D13; R32, R38): each with who brings it and who'd play it, most
// wanted first, I'd play for the host and people going, and I'll bring a game, which opens D6 with
// the member's own games on the table ticked. Anyone not going reads "Answer to say what you'd
// play." A night that's over shows its table as it was, with none of these.
export function TableGames({
  page,
  userId,
  choices,
  whatToPlay,
  over,
}: {
  page: Night;
  userId: string;
  // The member's own copies for D6, when they may bring games.
  choices: NightGameChoices | null;
  // What should we play? beside the games (D2, D13); the host has it under What you can do.
  whatToPlay: boolean;
  // The night's day has gone, or it's cancelled.
  over: boolean;
}) {
  const [picking, setPicking] = useState(false);
  const [, startTransition] = useTransition();
  const { night, games } = page;
  const canBring = page.canBring && !over;
  const mine = games
    .filter((one) => one.owner.userId === userId)
    .map((one) => one.userGameId);
  const voted = games.some((one) => one.voters.length > 0);

  const bring = (picked: string[]) =>
    startTransition(async () => {
      const adding = (choices ?? [])
        .filter(
          (one) =>
            picked.includes(one.userGameId) && !mine.includes(one.userGameId),
        )
        .map((one) => ({ userGameId: one.userGameId, title: one.game.title }));
      const removing = mine.filter((id) => !picked.includes(id));
      if (adding.length === 0 && removing.length === 0) {
        return;
      }
      const result = await callResultAction(() =>
        bringGames(night.id, adding, removing),
      );
      notify(
        result && "message" in result && result.message
          ? result.message
          : (result?.error ?? "That didn’t save. Try again."),
      );
    });

  return (
    <Group
      label="Games on the table"
      aside={
        voted ? (
          <span className="font-mono text-13 font-medium">
            Most wanted first
          </span>
        ) : undefined
      }
    >
      {!canBring && !over && games.length > 0 && (
        <p className="text-13 text-muted-foreground">
          Answer to say what you’d play.
        </p>
      )}
      {games.length === 0 ? (
        <p className="text-13 text-muted-foreground">
          No games on the table yet.
        </p>
      ) : (
        <ul className="flex flex-col *:border-dashed *:border-foreground *:not-first:border-t-2">
          {games.map(({ userGameId, game, owner, voters }) => (
            <li
              key={userGameId}
              className="flex items-center gap-2.5 py-2.5 first:pt-0.5 last:pb-1"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.75">
                <span className="text-15 font-bold">{game.title}</span>
                <span className="font-mono text-2xs font-medium text-muted-foreground">
                  {tableLine(game)}
                </span>
                <span className="flex items-center gap-1.25 text-xs">
                  <Piece
                    shape={owner.pieceShape}
                    color={owner.pieceColor}
                    size={11}
                  />
                  {owner.userId === userId
                    ? "You bring it"
                    : `${owner.name} brings it`}
                </span>
                {voters.length === 0 ? (
                  <span data-ink="smudge" className="text-xs">
                    No one yet
                  </span>
                ) : (
                  <span className="flex items-center gap-0.75 text-xs">
                    {voters.map((one) => (
                      <Piece
                        key={one.userId}
                        shape={one.pieceShape}
                        color={one.pieceColor}
                        size={11}
                      />
                    ))}
                    <span className="ml-1">
                      {voters.length} {voters.length === 1 ? "wants" : "want"}{" "}
                      to play
                    </span>
                  </span>
                )}
              </span>
              {canBring && (
                <IdPlay
                  key={`${userGameId}-${voters.some((one) => one.userId === userId)}`}
                  gameNightId={night.id}
                  userGameId={userGameId}
                  pressed={voters.some((one) => one.userId === userId)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {/* One row, as D7 and D13 draw it: I'll bring a game at its own width, and What should we
          play? taking the rest, its words on two lines when they need them. A perforation parts
          it from the games above (D2, D7). */}
      {(canBring || whatToPlay) && (
        <div
          className={cn(
            "flex gap-2.5",
            games.length > 0 &&
              "border-t-2 border-dashed border-foreground pt-3",
          )}
        >
          {canBring && choices && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={() => setPicking(true)}
            >
              I’ll bring a game
            </Button>
          )}
          {whatToPlay && (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              nativeButton={false}
              render={
                <Link
                  href={`/nights/${night.id}/what-to-play`}
                  transitionTypes={["go-deeper"]}
                />
              }
            >
              <DicePair onBone size="button" />
              <span className="text-left leading-tight whitespace-normal">
                What should we play?
              </span>
            </Button>
          )}
        </div>
      )}
      {canBring && choices && (
        <PickGamesSheet
          open={picking}
          onOpenChange={setPicking}
          choices={choices}
          picked={mine}
          onDone={bring}
        />
      )}
    </Group>
  );
}
