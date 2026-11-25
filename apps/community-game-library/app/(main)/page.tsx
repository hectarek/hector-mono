import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { GameCardRow } from "@/app/_components/game-row";
import { LibraryList } from "@/app/_components/library-list";
import { PageColumn } from "@/app/_components/page-column";
import { ShareMyFriendLink } from "@/app/_components/share-my-friend-link";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { LibrarySearch } from "@/app/(main)/library-search";
import { LibrarySearchResults } from "@/app/(main)/library-search-results";
import { LibraryViews } from "@/app/(main)/library-views";
import { getInjection } from "@/di/container";
import {
  libraryViewSearch,
  parseLibraryView,
} from "@/src/entities/library-filters";

// The Library, All friends (B1 to B4, B10): every game on your and your friends' shelves as its
// card (U8), filtered and sorted from the address (R13), and search over them and the catalog
// (U6) at ?q=, which takes the list's place while something is typed.
//
// It waits on connection() before it reads the session, so neither the build's prerender nor a
// partial prefetch starts Neon's session read, which fails and logs when their render ends
// (docs/solutions/runtime-errors/partial-prefetching-runs-page-reads-that-fail-in-production.md).
// Whatever it reads after the session (the clock, the database) runs at request time, under the
// skeleton in loading.tsx.
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/welcome");
  }
  const params = await searchParams;
  const { q } = params;
  const search = typeof q === "string" ? q : "";
  const view = parseLibraryView(params);
  const field = (
    <LibrarySearch initial={search} keep={libraryViewSearch(view)} />
  );

  if (search.trim() !== "") {
    const results = await getInjection("ISearchGamesController")(
      { q: search },
      userId,
    );
    return (
      <PageColumn width="browse" header={<AppHeader title="Library" />}>
        {field}
        <LibrarySearchResults search={search} results={results} path="/" />
      </PageColumn>
    );
  }

  const library = await getInjection("IListLibraryController")(params, userId);
  const noFriends = (
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
  const friendsOwnNothing = (
    <Empty>
      <EmptyDescription>Your friends haven’t added games yet.</EmptyDescription>
    </Empty>
  );

  return (
    <PageColumn width="browse" header={<AppHeader title="Library" />}>
      <LibraryList
        path="/"
        search={field}
        views={<LibraryViews current="all-friends" />}
        view={view}
        list={{ ...library, shown: library.items.length }}
        owners={library.owners}
        viewerId={userId}
        whose="everyone"
        between={
          library.total > 0 &&
          (!library.hasFriends
            ? noFriends
            : !library.friendsOwnGames && friendsOwnNothing)
        }
        empty={library.hasFriends ? friendsOwnNothing : noFriends}
      >
        {library.items.map(({ game, card }) => (
          <GameCardRow
            key={game.id}
            game={game}
            card={card}
            href={`/games/${game.id}`}
          />
        ))}
      </LibraryList>
    </PageColumn>
  );
}
