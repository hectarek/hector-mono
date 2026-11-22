import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { GameForm } from "@/app/_components/game-form";
import { PageColumn } from "@/app/_components/page-column";
import { gate } from "@/app/_lib/account";
import { adminRead } from "@/app/(main)/admin/admin-reads";
import { addGame } from "@/app/actions/admin";
import { getInjection } from "@/di/container";

// G3, Add a game by hand (R5): from a suggestion (?suggestion=, G2's Add it by hand), the form
// starts with what was sent, and adding it answers the suggestion; from Admin, it starts empty.
export default async function AddGamePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { user } = await gate("app");
  const { suggestion: suggestionId } = await searchParams;
  const from =
    typeof suggestionId === "string"
      ? await adminRead(() =>
          getInjection("IGetSuggestionController")({ suggestionId }, user.id),
        )
      : null;
  // Anyone but the admin is Not found here too.
  if (!from) {
    await adminRead(() => getInjection("IListSuggestionsController")(user.id));
  }
  const who = from?.by?.name ?? "Someone";

  return (
    <PageColumn
      width="read"
      header={
        <AppHeader
          back={
            from
              ? {
                  href: `/admin/suggestions/${from.suggestion.id}`,
                  label: from.suggestion.title,
                }
              : { href: "/admin", label: "Admin" }
          }
        />
      }
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl leading-7 font-bold">Add a game by hand</h1>
        {from && (
          <p className="text-13 text-muted-foreground">
            From {who}’s suggestion. When you add it, {who} is told and it lands
            in their library.
          </p>
        )}
      </div>
      <GameForm
        action={addGame}
        game={
          from
            ? {
                title: from.suggestion.title,
                year: from.suggestion.year,
                publishers: from.suggestion.publisher
                  ? [from.suggestion.publisher]
                  : null,
                imageUrl: from.suggestion.imageUrl,
              }
            : {}
        }
        suggestionId={from?.suggestion.id}
        submitLabel="Add to the catalog"
        done="/admin"
      />
    </PageColumn>
  );
}
