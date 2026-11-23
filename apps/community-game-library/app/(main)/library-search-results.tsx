import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
} from "@repo/ui/components/empty";
import Link from "next/link";
import { CatalogRow, GameCardRow } from "@/app/_components/game-row";
import { Group } from "@/app/_components/group";
import { List } from "@/app/_components/list-row";
import type { DI_RETURN_TYPES } from "@/di/types";

type Results = Awaited<ReturnType<DI_RETURN_TYPES["ISearchGamesController"]>>;

// Search's results (R2, B10), wherever the Library's field is typed in, All friends or My
// library: the games on your and your friends' shelves as their cards, then the rest of the
// catalog, or the no-match line with Suggest a game. A game opened from them comes back to them
// (rule 11).
export function LibrarySearchResults({
  search,
  results,
  path,
}: {
  search: string;
  results: Results;
  // The page the search was typed on, which a game's way back returns to.
  path: string;
}) {
  const gameHref = (id: string) =>
    `/games/${id}?q=${encodeURIComponent(search)}${path === "/" ? "" : `&from=${encodeURIComponent(path)}`}`;
  // U9's suggestion page, with what was typed.
  const suggestHref = `/my-library/suggest?title=${encodeURIComponent(search.trim())}`;

  if (results.onShelves.length === 0 && results.inCatalog.length === 0) {
    return (
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
    );
  }
  return (
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
        <Group label={`In the catalog · ${results.inCatalog.length}`} overList>
          <List browse>
            {results.inCatalog.map(({ game, yours, base }) => (
              <CatalogRow
                key={game.id}
                game={game}
                yours={yours}
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
      {/* The catalog's sources' credit, Y1's foot of search results (U24). */}
      <p className="text-xs text-muted-foreground">
        Game facts from Wikidata and Wikipedia.
      </p>
    </>
  );
}
