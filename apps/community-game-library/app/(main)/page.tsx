import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
} from "@repo/ui/components/empty";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { CatalogRow, GameCardRow } from "@/app/_components/game-row";
import { Group } from "@/app/_components/group";
import { List } from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { LibrarySearch } from "@/app/(main)/library-search";
import { getInjection } from "@/di/container";

// The Library (B1), which U6 and U8 build. U6's half is search (R2, B10): ?q= holds what's
// typed, and the results come in two groups, the games on your and your friends' shelves as their
// cards, then the rest of the catalog. U8 adds the list of every game on those shelves, with its
// filters and sort, under the same field.
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
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const results =
    search.trim() === ""
      ? null
      : await getInjection("ISearchGamesController")({ q: search }, userId);
  // A game opened from the results comes back to them (rule 11).
  const gameHref = (id: string) =>
    `/games/${id}?q=${encodeURIComponent(search)}`;
  // U9's suggestion page, with what was typed.
  const suggestHref = `/my-library/suggest?title=${encodeURIComponent(search.trim())}`;

  return (
    <PageColumn width="browse" header={<AppHeader title="Library" />}>
      <LibrarySearch initial={search} />
      {results &&
        (results.onShelves.length === 0 && results.inCatalog.length === 0 ? (
          <Empty>
            <EmptyDescription>
              Nothing called “{search.trim()}” yet.
            </EmptyDescription>
            <EmptyContent>
              <Button
                variant="secondary"
                size="lg"
                nativeButton={false}
                render={<Link href={suggestHref} />}
              >
                Suggest a game
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            {results.onShelves.length > 0 && (
              <Group
                label={`Owned by you or a friend · ${results.onShelves.length}`}
                overList
              >
                <List browse>
                  {results.onShelves.map(({ game, card }) => (
                    <GameCardRow
                      key={game.id}
                      game={game}
                      card={card}
                      href={gameHref(game.id)}
                    />
                  ))}
                </List>
              </Group>
            )}
            {results.inCatalog.length > 0 && (
              <Group
                label={`In the catalog · ${results.inCatalog.length}`}
                overList
              >
                <List browse>
                  {results.inCatalog.map(({ game, base }) => (
                    <CatalogRow
                      key={game.id}
                      game={game}
                      base={base}
                      href={gameHref(game.id)}
                    />
                  ))}
                </List>
              </Group>
            )}
            <Button
              variant="link"
              nativeButton={false}
              render={<Link href={suggestHref} />}
              className="self-start"
            >
              Can’t find it? Suggest a game
            </Button>
          </>
        ))}
    </PageColumn>
  );
}
