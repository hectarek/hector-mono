import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import Link from "next/link";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { Group } from "@/app/_components/group";
import { PlusIcon } from "@/app/_components/icons";
import { List, ListRow, RowFacts, RowName } from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { SavedSwitch } from "@/app/_components/saved-switch";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { LibraryViews } from "@/app/(main)/library-views";
import { setPassAlongForAll } from "@/app/actions/copies";
import { getInjection } from "@/di/container";
import { coverColorOf } from "@/src/entities/piece";

// My library (B6, and A7 while it's empty): Add a game, the Lending panel's switch for every copy,
// then each copy, opening its own page. U8 makes the list the Library's shared one, with its
// filters and sort, and U9 adds the suggestions waiting on the admin.
export default async function MyLibraryPage() {
  await connection();
  const { user } = await gate("app");
  const { copies, passingAlong, defaultPassAlong } = await getInjection(
    "IListMyLibraryController",
  )(user.id);
  // The count is of games, not copies: a second copy is rare (B6).
  const games = new Set(copies.map(({ game }) => game.id)).size;

  return (
    <PageColumn width="browse" header={<AppHeader title="Library" />}>
      <LibraryViews current="my-library" />
      <Button
        nativeButton={false}
        render={<Link href="/my-library/add" />}
        className="self-start"
      >
        <PlusIcon data-icon="inline-start" />
        {copies.length > 0 ? "Add a game" : "Add your first game"}
      </Button>
      {copies.length > 0 && (
        <Group label="Lending">
          <SavedSwitch
            label="Friends can pass my games along"
            on={defaultPassAlong}
            save={setPassAlongForAll}
          />
          <p className="text-13 leading-snug text-muted-foreground">
            On for {passingAlong} of {copies.length}{" "}
            {copies.length === 1 ? "copy" : "copies"}. You can also set it on
            each copy’s page.
          </p>
        </Group>
      )}
      <p className="font-mono text-xs font-medium text-muted-foreground">
        {games} {games === 1 ? "game" : "games"}
      </p>
      {copies.length > 0 ? (
        <List browse>
          {copies.map(({ copy, game, card }) => (
            <ListRow
              key={copy.id}
              href={`/copies/${copy.id}`}
              thumb={
                <CoverThumb
                  color={coverColorOf(game)}
                  imageUrl={game.imageUrl}
                />
              }
              stamp={<Stamp tone={card.stamp.tone}>{card.stamp.word}</Stamp>}
            >
              <RowName>{game.title}</RowName>
              <RowFacts>{card.stateLine}</RowFacts>
            </ListRow>
          ))}
        </List>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Your library is empty</EmptyTitle>
            <EmptyDescription>
              Search for a game you own and tap I own it.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </PageColumn>
  );
}
