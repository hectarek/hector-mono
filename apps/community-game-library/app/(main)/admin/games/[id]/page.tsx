import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { GameForm } from "@/app/_components/game-form";
import { PageColumn } from "@/app/_components/page-column";
import { gate } from "@/app/_lib/account";
import { adminRead } from "@/app/(main)/admin/admin-reads";
import { updateGame } from "@/app/actions/admin";
import { getInjection } from "@/di/container";

// G4, a game's record (R5, R7): the admin corrects its details, its picture and its how-to-play
// link in G3's form, saved with Save.
export default async function GameRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { user } = await gate("app");
  const { id } = await params;
  const { game, baseGame } = await adminRead(() =>
    getInjection("IGetGameToEditController")({ gameId: id }, user.id),
  );

  return (
    <PageColumn
      width="read"
      header={
        <AppHeader
          back={{ href: "/admin/games", label: "Find a game to edit" }}
        />
      }
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl leading-7 font-bold">{game.title}</h1>
        {baseGame && (
          <p className="text-13 text-muted-foreground">
            An expansion of {baseGame.title}
          </p>
        )}
      </div>
      <GameForm action={updateGame} game={game} submitLabel="Save" />
    </PageColumn>
  );
}
