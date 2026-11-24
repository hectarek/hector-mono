"use client";

import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import Link from "next/link";
import { useState } from "react";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { Group } from "@/app/_components/group";
import { Piece } from "@/app/_components/piece";
import { Sheet } from "@/app/_components/sheet";
import type { DI_RETURN_TYPES } from "@/di/types";
import { cardLine } from "@/src/entities/game-facts";
import { coverColorOf } from "@/src/entities/piece";

export type NightGameChoices = Awaited<
  ReturnType<DI_RETURN_TYPES["IGetNightGameChoicesController"]>
>;

// Pick from your library (D6, R29): every copy of the member's, a game they keep from friends
// and one that's out now among them, each ticked or not; Done puts the ticked ones on the table in
// the list's order. Each box's label sits beside it: a Base UI control inside its own label flips
// twice on one click in happy-dom.
export function PickGamesSheet({
  open,
  onOpenChange,
  choices,
  picked,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  choices: NightGameChoices;
  picked: readonly string[];
  onDone: (picked: string[]) => void;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Pick from your library"
    >
      <Choices
        choices={choices}
        picked={picked}
        onDone={(next) => {
          onDone(next);
          onOpenChange(false);
        }}
      />
    </Sheet>
  );
}

// The sheet's content, which starts from what's on the table each time the sheet opens.
function Choices({
  choices,
  picked,
  onDone,
}: {
  choices: NightGameChoices;
  picked: readonly string[];
  onDone: (picked: string[]) => void;
}) {
  const [ticked, setTicked] = useState<readonly string[]>(picked);

  if (choices.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Your library is empty.</EmptyTitle>
          <EmptyDescription>
            Search for a game you own and tap I own it.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            variant="secondary"
            nativeButton={false}
            render={
              <Link href="/my-library/add" transitionTypes={["go-deeper"]} />
            }
          >
            Add your first game
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Group
        label="My library"
        aside={
          <span className="font-mono text-13 font-medium">
            {ticked.length} picked
          </span>
        }
      >
        <ul className="flex flex-col *:border-dashed *:border-foreground *:not-first:border-t-2">
          {choices.map(({ userGameId, game, lendable, holder }) => (
            <li key={userGameId} className="flex items-center gap-3 py-2.5">
              <Checkbox
                id={`pick-${userGameId}`}
                checked={ticked.includes(userGameId)}
                onCheckedChange={(on) =>
                  setTicked((now) =>
                    on
                      ? choices
                          .map((one) => one.userGameId)
                          .filter((id) => id === userGameId || now.includes(id))
                      : now.filter((id) => id !== userGameId),
                  )
                }
              />
              <label
                htmlFor={`pick-${userGameId}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <CoverThumb
                  color={coverColorOf(game)}
                  imageUrl={game.imageUrl}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-15 font-bold">{game.title}</span>
                  <span className="font-mono text-2xs font-medium text-muted-foreground">
                    {cardLine(game)}
                  </span>
                  {!lendable && (
                    <span className="text-xs text-muted-foreground">
                      Not lent to friends. Fine for your own night.
                    </span>
                  )}
                  {holder && (
                    <span className="flex items-center gap-1.25 text-xs">
                      <Piece
                        shape={holder.pieceShape}
                        color={holder.pieceColor}
                        size={11}
                      />
                      Out with {holder.name} now
                    </span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="border-t-2 border-dashed border-foreground pt-3 text-13 text-muted-foreground">
          People going can add games from their libraries too.
        </p>
      </Group>
      <Button type="button" size="lg" onClick={() => onDone([...ticked])}>
        Done
      </Button>
    </div>
  );
}
