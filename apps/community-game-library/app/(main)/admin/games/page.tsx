import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { List, ListRow, RowFacts, RowName } from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { gate } from "@/app/_lib/account";
import { adminRead } from "@/app/(main)/admin/admin-reads";
import { LibrarySearch } from "@/app/(main)/library-search";
import { getInjection } from "@/di/container";
import { coverColorOf } from "@/src/entities/piece";

// G5, Find a game to edit: the catalog by title, base games and expansions, each opening its
// record (G4). ?q= holds what's typed.
export default async function FindGamePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { user } = await gate("app");
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const games = await adminRead(() =>
    getInjection("IFindGamesToEditController")({ q: search }, user.id),
  );

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/admin", label: "Admin" }} />}
    >
      <h1 className="text-2xl leading-7 font-bold">Find a game to edit</h1>
      <LibrarySearch
        initial={search}
        path="/admin/games"
        label="Search the catalog"
      />
      {search.trim() !== "" && (
        <>
          <p className="font-mono text-xs font-medium text-muted-foreground">
            {games.length} {games.length === 1 ? "game" : "games"}
          </p>
          {games.length > 0 && (
            <List>
              {games.map((game) => (
                <ListRow
                  key={game.id}
                  href={`/admin/games/${game.id}`}
                  thumb={
                    <CoverThumb
                      color={coverColorOf(game)}
                      imageUrl={game.imageUrl}
                    />
                  }
                >
                  <RowName>{game.title}</RowName>
                  {game.year !== null && <RowFacts>{game.year}</RowFacts>}
                  {game.publishers?.[0] && (
                    <RowFacts>{game.publishers[0]}</RowFacts>
                  )}
                </ListRow>
              ))}
            </List>
          )}
        </>
      )}
    </PageColumn>
  );
}
