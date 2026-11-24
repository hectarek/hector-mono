"use client";

import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { useState } from "react";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { DicePair } from "@/app/_components/dice";
import { Group } from "@/app/_components/group";
import { MinusIcon, PlusIcon } from "@/app/_components/icons";
import { List, ListRow, RowName } from "@/app/_components/list-row";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import { useMoment } from "@/app/_lib/use-moment";
import type { DI_RETURN_TYPES } from "@/di/types";
import { listed } from "@/src/entities/listed";
import { coverColorOf } from "@/src/entities/piece";
import {
  offersComplexity,
  type PlayComplexity,
  type PlayTime,
  whatToPlay,
} from "@/src/entities/what-to-play";

type Choices = Awaited<ReturnType<DI_RETURN_TYPES["IWhatToPlayController"]>>;
type Choice = Choices["allGames"][number];

const TIMES: { value: `${PlayTime}`; minutes: PlayTime; words: string }[] = [
  { value: "60", minutes: 60, words: "1 hour" },
  { value: "90", minutes: 90, words: "90 min" },
  { value: "120", minutes: 120, words: "2 hours" },
  { value: "180", minutes: 180, words: "3 hours" },
];
const COMPLEXITIES: { value: PlayComplexity; words: string }[] = [
  { value: "light", words: "Light" },
  { value: "medium", words: "Medium" },
  { value: "heavy", words: "Heavy" },
  { value: "new-players", words: "New players" },
];
const MOST_PEOPLE = 30;
const STAMP_TILTS = [-3, 2] as const;

// "Sam brings it" for a game on the table; whose shelf it's on for any other.
function ownerWords(choice: Choice, userId: string): string {
  const names = choice.owners.map((one) =>
    one.userId === userId ? "You" : one.name,
  );
  if (choice.onTable) {
    return names[0] === "You" ? "You bring it" : `${names[0]} brings it`;
  }
  if (names.length === 1) {
    return names[0] === "You" ? "You have it" : `${names[0]} has it`;
  }
  return `${listed(names)} have it`;
}

// A choice of one, as D8 draws it: filter chips, or a segmented control for From. Tapping the one
// picked clears it where none is allowed (Complexity).
function ChoiceButtons<T extends string>({
  label,
  options,
  value,
  onChange,
  segmented = false,
}: {
  label: string;
  options: { value: T; words: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
  segmented?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="font-mono text-2xs font-medium text-muted-foreground">
        {label}
      </span>
      <ToggleGroup
        aria-label={label}
        spacing={segmented ? 0 : undefined}
        className={segmented ? "w-full" : "flex-wrap"}
        value={value === null ? [] : [value]}
        onValueChange={([next]) =>
          onChange(options.find((one) => one.value === next)?.value ?? null)
        }
      >
        {options.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.words}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

// What should we play? (D8; R37, KTD23): the people playing, the time we have, a complexity and
// where from, starting from the night, and the best fits first, each with why, then the games left
// out and why. The rules run here as the choices change (what-to-play.ts), and each change asks
// again, so the dice by the title tumble (U26).
export function WhatToPlayView({
  choices,
  userId,
}: {
  choices: Choices;
  userId: string;
}) {
  const [people, setPeople] = useState(Math.max(1, choices.people));
  const [minutes, setMinutes] = useState<PlayTime>(choices.minutes);
  const [complexity, setComplexity] = useState<PlayComplexity | null>(null);
  const [from, setFrom] = useState<"table" | "all">(
    choices.onTable.length > 0 ? "table" : "all",
  );
  const games = from === "table" ? choices.onTable : choices.allGames;
  const { fits, leftOut } = whatToPlay(games, { people, minutes, complexity });
  const offerComplexity = offersComplexity(games, complexity);
  const timeWords =
    TIMES.find((one) => one.value === `${minutes}`)?.words ?? "";
  const tumble = useMoment(`${people} ${minutes} ${complexity} ${from}`);

  return (
    <>
      <div className="flex items-center gap-2.5">
        <DicePair key={tumble.key} tumbling={tumble.playing} />
        <h1 className="text-2xl leading-7 font-bold">What should we play?</h1>
      </div>
      <Group label="Looking for">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            <span className="font-mono text-2xs font-medium text-muted-foreground">
              People playing
            </span>
            <ButtonGroup aria-label="People playing">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="One player fewer"
                disabled={people <= 1}
                onClick={() => setPeople(people - 1)}
              >
                <MinusIcon />
              </Button>
              <output
                aria-live="polite"
                className="flex h-11 w-14 items-center justify-center border-y-2 border-foreground bg-secondary font-mono text-lg font-medium"
              >
                {people}
              </output>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="One player more"
                disabled={people >= MOST_PEOPLE}
                onClick={() => setPeople(people + 1)}
              >
                <PlusIcon />
              </Button>
            </ButtonGroup>
            <span className="text-xs text-muted-foreground">
              {choices.people} {choices.people === 1 ? "is" : "are"} going,
              guests included.
            </span>
          </div>
          <ChoiceButtons
            label="Time we have"
            options={TIMES}
            value={`${minutes}`}
            onChange={(next) => {
              const time = TIMES.find((one) => one.value === next);
              if (time) setMinutes(time.minutes);
            }}
          />
          {offerComplexity && (
            <ChoiceButtons
              label="Complexity"
              options={COMPLEXITIES}
              value={complexity}
              onChange={setComplexity}
            />
          )}
          <ChoiceButtons
            label="From"
            options={[
              { value: "table", words: "Games on the table" },
              { value: "all", words: "All friends’ games" },
            ]}
            value={from}
            onChange={(next) => {
              if (next) setFrom(next);
            }}
            segmented
          />
        </div>
      </Group>

      {fits.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-foreground p-3.5 text-13">
          Nothing fits {people} {people === 1 ? "person" : "people"} in{" "}
          {timeWords}. Try more time
          {offerComplexity ? " or another complexity" : ""}.
        </p>
      ) : (
        <Group label="Best fits first" overList>
          <List>
            {fits.map(({ game, players, facts }, index) => (
              <ListRow
                key={game.id}
                href={`/games/${game.id}`}
                thumb={
                  <CoverThumb
                    color={coverColorOf(game)}
                    imageUrl={game.imageUrl}
                  />
                }
                stamp={
                  game.onTable ? (
                    <Stamp tilt={STAMP_TILTS[index % STAMP_TILTS.length]}>
                      On the table
                    </Stamp>
                  ) : undefined
                }
              >
                <RowName>{game.title}</RowName>
                <span className="font-mono text-2xs font-medium text-muted-foreground">
                  {players}
                </span>
                {facts && (
                  <span className="font-mono text-2xs font-medium text-muted-foreground">
                    {facts}
                  </span>
                )}
                <span className="flex items-center gap-1.25 text-xs">
                  {game.owners[0] && (
                    <Piece
                      shape={game.owners[0].pieceShape}
                      color={game.owners[0].pieceColor}
                      size={11}
                    />
                  )}
                  {ownerWords(game, userId)}
                </span>
              </ListRow>
            ))}
          </List>
        </Group>
      )}

      {leftOut.length > 0 && (
        <section className="flex flex-col gap-2 rounded-lg border-2 border-dashed border-foreground p-3.5">
          <h2 className="text-sm font-bold">Left out</h2>
          <p className="text-13 text-muted-foreground">
            {leftOut.map((one) => one.reason).join(" ")}
          </p>
        </section>
      )}
    </>
  );
}
