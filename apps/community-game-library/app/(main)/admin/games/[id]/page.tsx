import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { GameForm } from "@/app/_components/game-form";
import { PageColumn } from "@/app/_components/page-column";
import { gate } from "@/app/_lib/account";
import { adminRead } from "@/app/(main)/admin/admin-reads";
import { updateGame } from "@/app/actions/admin";
import { getInjection } from "@/di/container";

// G4, a game's record (R5, R7): the admin corrects its details, its picture, its how-to-play
// link and whether it's an expansion in G3's whole form (Hector, 2026-11-25), saved with Save.
export default async function GameRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { user } = await gate("app");
  const { id } = await params;
  const [{ game, baseGame }, categories] = await Promise.all([
    adminRead(() =>
      getInjection("IGetGameToEditController")({ gameId: id }, user.id),
    ),
    adminRead(() => getInjection("IListCategoriesController")(user.id)),
  ]);

  return (
    <PageColumn
      width="read"
      header={
        <AppHeader
          back={{ href: "/admin/games", label: "Find a game to edit" }}
        />
      }
    >
      <GameForm
        action={updateGame}
        title={game.title}
        subtitle={baseGame ? `An expansion of ${baseGame.title}` : undefined}
        game={game}
        baseGame={baseGame}
        categories={categories}
        submitLabel="Save"
      />
    </PageColumn>
  );
}
