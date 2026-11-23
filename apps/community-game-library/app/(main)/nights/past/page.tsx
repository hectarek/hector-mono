import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from "@repo/ui/components/empty";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import {
  List,
  ListRow,
  RowFacts,
  RowLine,
  RowName,
} from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import type { DI_RETURN_TYPES } from "@/di/types";
import { formatDate, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

type PastNight = Awaited<
  ReturnType<DI_RETURN_TYPES["IListPastNightsController"]>
>[number];

// "Jo hosted · 5 came · 3 games", only what the night has (rule 14); a cancelled night says who
// was hosting.
function pastWords({ night, host, came, games }: PastNight, userId: string) {
  const mine = host.userId === userId;
  if (night.cancelledAt !== null) {
    return mine ? "You were hosting" : `${host.name} was hosting`;
  }
  return [
    mine ? "You hosted" : `${host.name} hosted`,
    `${came} came`,
    games > 0 && (games === 1 ? "1 game" : `${games} games`),
  ]
    .filter(Boolean)
    .join(" · ");
}

// Past game nights (D12, R33): the nights the member could see whose day has gone, and the
// cancelled ones, newest first, each opening its night, stamped Cancelled where it was.
export default async function PastNightsPage() {
  await connection();
  const { user } = await gate("app");
  const nights = await getInjection("IListPastNightsController")(user.id);
  const today = todayIn(PLAN_TIME_ZONE);

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/nights", label: "Nights" }} />}
    >
      <h1 className="text-2xl leading-7 font-bold">Past game nights</h1>
      {nights.length > 0 ? (
        <List>
          {nights.map((past) => (
            <ListRow
              key={past.night.id}
              href={`/nights/${past.night.id}`}
              stamp={
                past.night.cancelledAt !== null ? (
                  <Stamp tone="brown">Cancelled</Stamp>
                ) : undefined
              }
            >
              <RowName>{past.night.title}</RowName>
              <RowFacts>
                {formatDate(
                  todayIn(PLAN_TIME_ZONE, past.night.startsAt),
                  today,
                )}
              </RowFacts>
              <RowLine>
                <Piece
                  shape={past.host.pieceShape}
                  color={past.host.pieceColor}
                  size={11}
                />
                {pastWords(past, user.id)}
              </RowLine>
            </ListRow>
          ))}
        </List>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyDescription>No past game nights.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </PageColumn>
  );
}
