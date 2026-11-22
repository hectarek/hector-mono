import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
} from "@repo/ui/components/empty";
import Link from "next/link";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { CatalogRow } from "@/app/_components/game-row";
import { Group } from "@/app/_components/group";
import { AddedSoFar, AddedTally } from "@/app/_components/i-own-it";
import { List } from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { gate } from "@/app/_lib/account";
import { LibrarySearch } from "@/app/(main)/library-search";
import { getInjection } from "@/di/container";

// Add games (B8, R3): search the whole catalog in one list, closest first, and tap I own it on
// as many as you have, without leaving the page. Each added row reads Added with Undo, and the
// footer counts them. ?q= holds what's typed.
export default async function AddGamesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { user } = await gate("app");
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const results =
    search.trim() === ""
      ? null
      : await getInjection("ISearchGamesController")(
          { q: search, order: "closest-first" },
          user.id,
        );
  // U9's suggestion page, with what was typed.
  const suggestHref = `/my-library/suggest?title=${encodeURIComponent(search.trim())}&from=add`;
  const suggest = (
    <Button
      variant="link"
      nativeButton={false}
      render={<Link href={suggestHref} />}
      className="self-start"
    >
      Can’t find it? Suggest a game
    </Button>
  );

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/my-library", label: "My library" }} />}
    >
      <h1 className="text-2xl leading-7 font-bold">Add games</h1>
      <LibrarySearch
        initial={search}
        path="/my-library/add"
        label="Search the catalog"
      />
      <AddedTally>
        {results === null ? (
          <Empty>
            <EmptyDescription>Search for a game you own.</EmptyDescription>
          </Empty>
        ) : results.inCatalog.length === 0 ? (
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
            <Group
              label={`In the catalog · ${results.inCatalog.length}`}
              overList
            >
              <List>
                {results.inCatalog.map(({ game, yours, base }) => (
                  <CatalogRow
                    key={game.id}
                    game={game}
                    yours={yours}
                    base={base}
                    href={`/games/${game.id}`}
                  />
                ))}
              </List>
            </Group>
            {suggest}
          </>
        )}
        <div className="flex items-center justify-between gap-3">
          <AddedSoFar />
          <Button nativeButton={false} render={<Link href="/my-library" />}>
            Done
          </Button>
        </div>
      </AddedTally>
    </PageColumn>
  );
}
