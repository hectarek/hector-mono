import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { Group } from "@/app/_components/group";
import {
  List,
  ListItem,
  ListRow,
  RowFacts,
  RowName,
} from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { DeleteAccount } from "@/app/(main)/you/delete/delete-account";
import { getInjection } from "@/di/container";
import { copyState, isOverdue } from "@/src/entities/loan";
import { coverColorOf } from "@/src/entities/piece";
import { formatDate, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

// "4 games leave", "1 game leaves".
const gamesLeave = (games: number) =>
  games === 1 ? "1 game leaves" : `${games} games leave`;

// Delete my account (E8, R41): the loans to settle first, each opening its loan's page, with Delete
// my account switched off while there are any; what else ends; and what leaves with the account.
// The button asks first (E9).
export default async function DeleteAccountPage() {
  await connection();
  const { user } = await gate("app");
  const now = new Date();
  const today = todayIn(PLAN_TIME_ZONE, now);
  const ends = await getInjection("IListWhatEndsController")(user.id);
  const { settleFirst, nights, yourRequests, requestsForYours, games } = ends;
  const alsoEnds = [
    ...nights.map((night) => ({
      key: night.id,
      line: `${night.title}, ${formatDate(todayIn(PLAN_TIME_ZONE, night.startsAt), today)}: cancelled, and everyone is told`,
    })),
    ...yourRequests.map(({ loan, game, inLine }) => ({
      key: loan.id,
      line: inLine
        ? `Your place in line for ${game.title}`
        : `Your request for ${game.title}`,
    })),
    ...requestsForYours.map(({ loan, game, by, inLine }) => ({
      key: loan.id,
      line: inLine
        ? `${by.name}’s place in line for ${game.title}`
        : `${by.name}’s request for ${game.title}`,
    })),
  ];

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/you", label: "You" }} />}
    >
      <h1 className="text-2xl leading-7 font-bold">Delete my account</h1>
      {settleFirst.length > 0 && (
        <>
          <Group label="Settle your loans first">
            <p className="text-13 leading-snug text-muted-foreground">
              Once every game is back where it belongs, you can delete your
              account.
            </p>
          </Group>
          <Group label={`Open loans · ${settleFirst.length}`} overList>
            <List>
              {settleFirst.map(({ loan, copy, game, holder }) => {
                const { stamp } = copyState(copy, [loan], user.id, today);
                return (
                  <ListRow
                    key={loan.id}
                    href={`/loans/${loan.id}`}
                    thumb={
                      <CoverThumb
                        color={coverColorOf(game)}
                        imageUrl={game.imageUrl}
                      />
                    }
                    stamp={<Stamp tone={stamp.tone}>{stamp.word}</Stamp>}
                  >
                    <RowName>{game.title}</RowName>
                    {/* Who has it and when it's due, as mono facts (E8). */}
                    <span className="flex items-center gap-1.25 font-mono text-2xs font-medium whitespace-nowrap text-muted-foreground">
                      <Piece
                        shape={holder.pieceShape}
                        color={holder.pieceColor}
                        size={11}
                      />
                      {holder.userId === user.id
                        ? "You have it"
                        : `${holder.name} has it`}
                    </span>
                    {loan.dueOn && !isOverdue(loan, today) && (
                      <RowFacts>Due {formatDate(loan.dueOn, today)}</RowFacts>
                    )}
                  </ListRow>
                );
              })}
            </List>
            <p className="text-xs text-muted-foreground">
              Open a loan to settle it.
            </p>
          </Group>
        </>
      )}
      {alsoEnds.length > 0 && (
        <Group label="This also ends" overList>
          <List>
            {alsoEnds.map(({ key, line }) => (
              <ListItem key={key}>
                <span className="text-sm leading-snug">{line}</span>
              </ListItem>
            ))}
          </List>
        </Group>
      )}
      <p className="text-13 leading-snug text-muted-foreground">
        When you delete it,{" "}
        {games > 0 &&
          `your ${gamesLeave(games)} your friends’ libraries with you, and `}
        your friends stop seeing you. This can’t be undone.
      </p>
      <DeleteAccount
        settled={settleFirst.length === 0}
        games={games}
        nights={nights.map(({ id, title }) => ({ id, title }))}
        asked={yourRequests.length > 0}
      />
    </PageColumn>
  );
}
