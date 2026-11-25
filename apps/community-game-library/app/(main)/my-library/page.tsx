import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
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
import { LibraryList } from "@/app/_components/library-list";
import {
  List,
  ListItem,
  ListRow,
  RowFacts,
  RowName,
} from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { SavedSwitch } from "@/app/_components/saved-switch";
import { ShareMyFriendLink } from "@/app/_components/share-my-friend-link";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { LibrarySearch } from "@/app/(main)/library-search";
import { LibrarySearchResults } from "@/app/(main)/library-search-results";
import { LibraryViews } from "@/app/(main)/library-views";
import { setPassAlongForAll } from "@/app/actions/copies";
import { getInjection } from "@/di/container";
import {
  libraryViewSearch,
  parseLibraryView,
} from "@/src/entities/library-filters";
import { coverColorOf } from "@/src/entities/piece";
import { formatDay } from "@/src/entities/week";

// My library (B6, and A7 while it's empty): Add a game, the Lending panel's switch for every
// copy, then each copy in the Library's one list, with its filters and sort (U8), opening the
// copy's own page, then the member's suggestions waiting on the admin (U9; screens.md, Send a
// suggestion). The field searches as All friends' does (B10), the results in the list's place.
export default async function MyLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { user } = await gate("app");
  const params = await searchParams;
  const { q } = params;
  const search = typeof q === "string" ? q : "";
  const view = parseLibraryView(params);
  const field = (
    <LibrarySearch
      initial={search}
      path="/my-library"
      keep={libraryViewSearch(view)}
    />
  );

  if (search.trim() !== "") {
    const results = await getInjection("ISearchGamesController")(
      { q: search },
      user.id,
    );
    return (
      <PageColumn width="browse" header={<AppHeader title="Library" />}>
        {field}
        <LibrarySearchResults
          search={search}
          results={results}
          path="/my-library"
        />
      </PageColumn>
    );
  }

  const library = await getInjection("IListMyLibraryController")(
    params,
    user.id,
  );
  const now = new Date();
  const noFriends = !library.hasFriends && (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No friends yet</EmptyTitle>
        <EmptyDescription>
          Share your friend link to see what your friends own.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <ShareMyFriendLink />
      </EmptyContent>
    </Empty>
  );

  return (
    <PageColumn width="browse" header={<AppHeader title="Library" />}>
      <LibraryList
        path="/my-library"
        search={field}
        views={<LibraryViews current="my-library" />}
        view={view}
        // The count is of games, not copies: a second copy is rare (B6, ABF-24).
        list={{
          ...library,
          shown: new Set(library.items.map(({ game }) => game.id)).size,
        }}
        owners={[]}
        viewerId={user.id}
        whose="yours"
        sortInCount={false}
        between={
          <>
            <Button
              nativeButton={false}
              render={
                <Link href="/my-library/add" transitionTypes={["go-deeper"]} />
              }
              className="self-start"
            >
              <PlusIcon data-icon="inline-start" />
              {library.total > 0 ? "Add a game" : "Add your first game"}
            </Button>
            {library.total > 0 && (
              <Group label="Lending">
                <SavedSwitch
                  label="Friends can pass my games along"
                  on={library.defaultPassAlong}
                  save={setPassAlongForAll}
                />
                <p className="text-13 leading-snug text-muted-foreground">
                  On for {library.passingAlong} of {library.copies}{" "}
                  {library.copies === 1 ? "copy" : "copies"}. You can also set
                  it on each copy’s page.
                </p>
              </Group>
            )}
          </>
        }
        empty={
          <>
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Your library is empty</EmptyTitle>
                <EmptyDescription>
                  Search for a game you own and tap I own it.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
            {noFriends}
          </>
        }
      >
        {library.items.map(({ copy, game, card }) => (
          <ListRow
            key={copy.id}
            href={`/copies/${copy.id}`}
            thumb={
              <CoverThumb color={coverColorOf(game)} imageUrl={game.imageUrl} />
            }
            stamp={<Stamp tone={card.stamp.tone}>{card.stamp.word}</Stamp>}
          >
            <RowName>{game.title}</RowName>
            <RowFacts>{card.stateLine}</RowFacts>
          </ListRow>
        ))}
      </LibraryList>
      {library.suggestions.length > 0 && (
        <Group label="Suggested" overList>
          <List>
            {library.suggestions.map((suggestion) => (
              <ListItem key={suggestion.id}>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <RowName>{suggestion.title}</RowName>
                  <RowFacts>
                    suggested {formatDay(suggestion.createdAt, now)} · waiting
                    on the admin
                  </RowFacts>
                </span>
              </ListItem>
            ))}
          </List>
        </Group>
      )}
    </PageColumn>
  );
}
