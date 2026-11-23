"use client";

import { Button } from "@repo/ui/components/button";
import { useState, useTransition } from "react";
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
// went wrong when the vote doesn't save.
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
// play."
export function TableGames({
  page,
  userId,
  choices,
}: {
  page: Night;
  userId: string;
  // The member's own copies for D6, when they may bring games.
  choices: NightGameChoices | null;
}) {
  const [picking, setPicking] = useState(false);
  const [, startTransition] = useTransition();
  const { night, games, canBring } = page;
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
      {!canBring && games.length > 0 && (
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
            <li key={userGameId} className="flex items-center gap-2.5 py-2.5">
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
                  <span className="text-xs text-muted-foreground">
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
      {canBring && choices && (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => setPicking(true)}
          >
            I’ll bring a game
          </Button>
          <PickGamesSheet
            open={picking}
            onOpenChange={setPicking}
            choices={choices}
            picked={mine}
            onDone={bring}
          />
        </>
      )}
    </Group>
  );
}
