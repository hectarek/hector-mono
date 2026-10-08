import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { BookOpen, Copy, Library, Plus } from "lucide-react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { LibraryResults } from "@/app/_components/library-results";
import { PageMotion } from "@/app/_components/page-motion";
import { ProduceTile } from "@/app/_components/produce-tile";
import { PageTitle, SpaceHeader } from "@/app/_components/space-header";
import { SpaceSwitcher } from "@/app/_components/space-switcher";
import { TitleMenu } from "@/app/_components/title-menu";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { ALL_RECIPES, loadBooks } from "@/app/_lib/load-books";
import { firstParam, type SearchParams } from "@/app/_lib/search-params";
import { getInjection } from "@/di/container";
import { hasRole } from "@/src/entities/models/space.model";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const search = firstParam(params.q);
  const tag = firstParam(params.tag);
  const group = firstParam(params.group);
  const sort = firstParam(params.sort);
  const savedOnly = firstParam(params.saved) === "1";
  const requestedBook = firstParam(params.book);
  const { books, current, showAll, saved, library } = await loadLibrary(
    requestedBook,
    tag,
  );

  // In All recipes, Add recipe goes to your own book (the form offers the others).
  const canEdit = showAll || hasRole(current.role, "editor");
  const viewId = showAll ? ALL_RECIPES : current.id;
  const newHref = showAll ? "/recipes/new" : `/recipes/new?book=${current.id}`;
  const newButton = canEdit && (
    <Button size="lg" nativeButton={false} render={<Link href={newHref} />}>
      <Plus data-icon="inline-start" />
      Add recipe
    </Button>
  );
  // In the ⋯ sheet (D42): the Books page, to add a book or choose the default.
  const allBooks = (
    <Button
      variant="secondary"
      size="lg"
      nativeButton={false}
      render={<Link href="/books" transitionTypes={["go-deeper"]} />}
    >
      <Library data-icon="inline-start" />
      All books
    </Button>
  );

  // Whose book (D82): your own first, then the ones shared with you, marked as such.
  const pills = [
    ...books.filter((book) => book.role === "owner"),
    ...books.filter((book) => book.role !== "owner"),
  ].map(({ id, name, role }) => ({ id, name, shared: role !== "owner" }));

  return (
    <PageMotion>
      <div className="flex flex-col gap-4">
        <SpaceSwitcher
          spaces={
            books.length > 1
              ? [{ id: ALL_RECIPES, name: "All recipes" }, ...pills]
              : pills
          }
          currentId={viewId}
          label="Recipe books"
          hrefFor={(id) => `/?book=${id}`}
        />

        {showAll ? (
          <PageTitle
            label="Recipe books"
            title="All recipes"
            action={newButton}
            menu={<TitleMenu name="All recipes">{allBooks}</TitleMenu>}
          />
        ) : (
          <SpaceHeader space={current} action={newButton}>
            {allBooks}
          </SpaceHeader>
        )}

        <LibraryResults
          // A new tag, Saved or address starts from its own search and arrangement; typing and
          // Sort and group only update ?q=, ?sort= and ?group= in place.
          key={`${viewId}|${tag ?? ""}|${search ?? ""}|${group ?? ""}|${sort ?? ""}|${savedOnly}`}
          book={requestedBook}
          tags={library.tags}
          tagGroups={library.tagGroups}
          activeTag={tag}
          recipes={
            savedOnly
              ? library.recipes.filter((recipe) => saved.includes(recipe.id))
              : library.recipes
          }
          saved={saved}
          savedOnly={savedOnly}
          total={library.total}
          bookNames={
            showAll
              ? Object.fromEntries(books.map((book) => [book.id, book.name]))
              : undefined
          }
          empty={
            <Empty className="my-6">
              <EmptyHeader>
                <ProduceTile
                  produce="tomato"
                  className="size-12 -rotate-4 items-center justify-center rounded-xl"
                >
                  <BookOpen className="size-6" />
                </ProduceTile>
                <EmptyTitle>No recipes yet</EmptyTitle>
                <EmptyDescription>
                  {canEdit
                    ? "Add a recipe, or copy some in from another book."
                    : "Nothing's been added to this book yet."}
                </EmptyDescription>
              </EmptyHeader>
              {canEdit && (
                <EmptyContent>
                  <Button
                    variant="secondary"
                    size="lg"
                    nativeButton={false}
                    render={<Link href={newHref} />}
                  >
                    Add a recipe
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          }
        />
        {library.recipes.length > 0 && !showAll && books.length > 1 && (
          <Button
            variant="secondary"
            size="lg"
            nativeButton={false}
            render={
              <Link
                href={`/books/${current.id}/copy`}
                transitionTypes={["go-deeper"]}
              />
            }
            className="self-center"
          >
            <Copy data-icon="inline-start" />
            Copy recipes to another book
          </Button>
        )}
      </div>
    </PageMotion>
  );
}

// D87: kept in the phone's memory for 5 minutes, never on the server, so coming back to the
// library shows it at once, and the Recipes tab gets it ready before it's tapped. Any save
// clears it; someone else's change can take up to 5 minutes to show. Everything the page
// reads is in here: a read outside it would load after the tap.
async function loadLibrary(
  requestedBook: string | undefined,
  tag: string | undefined,
) {
  "use cache: private";
  cacheLife({ stale: 300 });

  const userId = await getCurrentUserId();
  const { books, current } = await loadBooks(
    userId,
    requestedBook === ALL_RECIPES ? undefined : requestedBook,
  );
  // With no book asked for, their default book; without one, All recipes once they're in
  // two or more (D17).
  const showAll =
    requestedBook === ALL_RECIPES ||
    (!requestedBook &&
      books.length > 1 &&
      !books.some((book) => book.isDefault));
  // Every card the tag allows: the search narrows them in the page as you type (P10.4).
  // This person's saved recipes (D77): first by default, and the Saved chip's filter.
  const saved = await getInjection("IGetBookmarksController")(userId);
  const library = showAll
    ? await getInjection("IGetAllRecipesController")({ tag }, userId)
    : await getInjection("IGetRecipesController")(
        { spaceId: current.id, tag },
        userId,
      );
  return { books, current, showAll, saved, library };
}
