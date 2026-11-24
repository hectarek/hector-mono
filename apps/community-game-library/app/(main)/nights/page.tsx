import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import Link from "next/link";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { Group } from "@/app/_components/group";
import { List, ListRow, RowName } from "@/app/_components/list-row";
import { NightCard } from "@/app/_components/night-row";
import { PageColumn } from "@/app/_components/page-column";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

// D1's stamps tilt one way, then the other.
const TILTS = [3, -3] as const;

// Nights (D1, R33): the nights coming up that the member can see, soonest first, each a card
// that opens its night, with New night beside the title. Past nights fold away under Past game
// nights (D12), with how many there are.
export default async function NightsPage() {
  await connection();
  const { user } = await gate("app");
  const cards = await getInjection("IListNightsController")(user.id);
  const past = await getInjection("IListPastNightsController")(user.id);
  const today = todayIn(PLAN_TIME_ZONE);

  return (
    <PageColumn
      width="read"
      header={
        <AppHeader
          title="Nights"
          action={
            <Button
              size="sm"
              variant="secondary"
              nativeButton={false}
              render={
                <Link href="/nights/new" transitionTypes={["go-deeper"]} />
              }
            >
              New night
            </Button>
          }
        />
      }
    >
      {cards.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No game nights coming up.</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="secondary"
              nativeButton={false}
              render={
                <Link href="/nights/new" transitionTypes={["go-deeper"]} />
              }
            >
              New game night
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Group label="Coming up" overList>
          <ul className="flex flex-col gap-3">
            {cards.map((card, index) => (
              <li key={card.night.id}>
                <NightCard
                  card={card}
                  today={today}
                  tilt={TILTS[index % TILTS.length]}
                />
              </li>
            ))}
          </ul>
        </Group>
      )}
      <List>
        <ListRow href="/nights/past" aside={past.length}>
          <RowName>Past game nights</RowName>
        </ListRow>
      </List>
    </PageColumn>
  );
}
