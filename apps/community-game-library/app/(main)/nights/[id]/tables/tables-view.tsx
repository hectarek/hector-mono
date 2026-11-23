"use client";

import { Button } from "@repo/ui/components/button";
import { useState } from "react";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { DicePair } from "@/app/_components/dice";
import { Group } from "@/app/_components/group";
import { Piece } from "@/app/_components/piece";
import { notify } from "@/app/_lib/notify";
import { shareOrCopy } from "@/app/_lib/share";
import type { DI_RETURN_TYPES } from "@/di/types";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import { coverColorOf } from "@/src/entities/piece";
import { splitTables, type TableParty } from "@/src/entities/tables";
import { minutesWords } from "@/src/entities/what-to-play";

type Choices = Awaited<ReturnType<DI_RETURN_TYPES["ISplitTablesController"]>>;
type Party = TableParty<NameAndPiece>;
type Fit = NonNullable<
  ReturnType<
    typeof splitTables<NameAndPiece, Choices["allGames"][number]>
  >["oneTable"]
>;

// Each seat at a table: the member, then a smaller pawn for each guest, named for them.
function seatsOf(parties: readonly Party[], userId: string) {
  return parties.flatMap(({ member, guests }) => [
    {
      key: member.userId,
      name: member.userId === userId ? "You" : member.name,
      shape: member.pieceShape,
      color: member.pieceColor,
      guest: false,
    },
    ...Array.from({ length: guests }, (_, index) => ({
      key: `${member.userId}-guest-${index + 1}`,
      name: `${member.userId === userId ? "Your" : `${member.name}’s`} guest`,
      shape: "pawn" as const,
      color: member.pieceColor,
      guest: true,
    })),
  ]);
}

// The ready message for the share sheet: each table's game and who sits there, by name (KTD23).
function splitMessage(
  title: string,
  tables: { fit: Fit; parties: Party[] }[],
): string {
  return [
    `Tables for ${title}:`,
    ...tables.map(
      ({ fit, parties }, index) =>
        `Table ${index + 1} · ${fit.game.title}: ${parties
          .flatMap(({ member, guests }) => [
            member.name,
            ...Array.from({ length: guests }, () => `${member.name}’s guest`),
          ])
          .join(", ")}`,
    ),
  ].join("\n");
}

function TableCard({
  index,
  fit,
  parties,
  userId,
}: {
  index: number;
  fit: Fit;
  parties: Party[];
  userId: string;
}) {
  const seats = seatsOf(parties, userId);
  return (
    <Group
      label={`Table ${index + 1} · ${seats.length} ${seats.length === 1 ? "player" : "players"}`}
    >
      <div className="flex items-center gap-3">
        <CoverThumb
          color={coverColorOf(fit.game)}
          imageUrl={fit.game.imageUrl}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-15 font-bold">{fit.game.title}</span>
          <span className="font-mono text-2xs font-medium text-muted-foreground">
            {[fit.players, minutesWords(fit.game)].filter(Boolean).join(" · ")}
          </span>
        </span>
      </div>
      <ul className="flex flex-wrap items-end gap-2.5 border-t-2 border-dashed border-foreground pt-3">
        {seats.map((seat) => (
          <li
            key={seat.key}
            className="flex min-w-11 flex-col items-center gap-1"
          >
            <Piece
              shape={seat.shape}
              color={seat.color}
              size={seat.guest ? 16 : 24}
            />
            <span className="font-mono text-2xs font-medium whitespace-nowrap text-muted-foreground">
              {seat.name}
            </span>
          </li>
        ))}
      </ul>
    </Group>
  );
}

// Split into tables (D9; R46, KTD23): the fewest even tables for the people going, each with the
// game that fits it best, "Or one table for all 6" when a game seats everyone, Try another split,
// and Share with everyone going, which stores nothing: only the member sees the split until they
// share it. With too few going to split (two or three), the one table is the answer.
export function TablesView({
  choices,
  userId,
}: {
  choices: Choices;
  userId: string;
}) {
  const { splits, oneTable } = splitTables(
    choices.parties,
    choices.onTable,
    choices.allGames,
    choices.minutes,
  );
  const [shown, setShown] = useState(0);
  const [oneForAll, setOneForAll] = useState(false);
  // Too few going to split: one table for all is the only way, when a game seats them.
  const together = oneForAll || splits.length === 0;
  const everyone = choices.parties.reduce(
    (sum, party) => sum + 1 + party.guests,
    0,
  );
  const split = splits[shown % Math.max(1, splits.length)];
  const tables =
    together && oneTable
      ? [{ fit: oneTable, parties: choices.parties }]
      : (split ?? []);

  async function share() {
    const result = await shareOrCopy({
      text: splitMessage(choices.night.title, tables),
    });
    if (result === "copied") notify("Tables copied");
    if (result === "failed") notify("That didn’t copy. Try again.");
  }

  if (tables.length === 0) {
    return (
      <p className="rounded-lg border-2 border-dashed border-foreground p-3.5 text-13">
        No game fits a table for{" "}
        {everyone === 1 ? "1 person" : `these ${everyone} people`} yet. Bring a
        game, or ask friends to.
      </p>
    );
  }

  return (
    <>
      <Group label="Sharing">
        <p className="text-13 text-muted-foreground">
          Only you see this until you share it.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="self-start"
          onClick={share}
        >
          Share with everyone going
        </Button>
      </Group>
      {tables.map(({ fit, parties }, index) => (
        <TableCard
          key={fit.game.id}
          index={index}
          fit={fit}
          parties={parties}
          userId={userId}
        />
      ))}
      {oneTable && !together && (
        <section className="flex flex-col gap-2.5 rounded-lg border-2 border-dashed border-foreground bg-secondary p-3">
          <div className="flex items-center gap-2.5">
            <DicePair onBone />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-mono text-2xs font-medium text-destructive uppercase">
                Or one table for all {everyone}
              </span>
              <span className="text-15 font-bold">{oneTable.game.title}</span>
              <span className="text-13 text-muted-foreground">
                {[oneTable.players, minutesWords(oneTable.game)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => setOneForAll(true)}
          >
            Use one table
          </Button>
        </section>
      )}
      {oneForAll ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setOneForAll(false)}
        >
          Split into tables again
        </Button>
      ) : (
        splits.length > 1 && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShown(shown + 1)}
          >
            Try another split
          </Button>
        )
      )}
    </>
  );
}
