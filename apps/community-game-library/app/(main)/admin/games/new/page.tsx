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
// Its categories to tap are the catalog's, which only the admin reads, so anyone else is Not
// found here too.
export default async function AddGamePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { user } = await gate("app");
  const { suggestion: suggestionId } = await searchParams;
  const [categories, from] = await Promise.all([
    adminRead(() => getInjection("IListCategoriesController")(user.id)),
    typeof suggestionId === "string"
      ? adminRead(() =>
          getInjection("IGetSuggestionController")({ suggestionId }, user.id),
        )
      : null,
  ]);
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
      <GameForm
        action={addGame}
        title="Add a game by hand"
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
        categories={categories}
        suggestion={
          from
            ? { id: from.suggestion.id, by: from.by?.name ?? "Someone" }
            : undefined
        }
        submitLabel="Add to the catalog"
        done="/admin"
      />
    </PageColumn>
  );
}
