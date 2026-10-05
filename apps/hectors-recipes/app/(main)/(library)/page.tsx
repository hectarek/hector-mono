import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { BookOpen, Copy, Library, Plus } from "lucide-react";
import Link from "next/link";
import { LibraryResults } from "@/app/_components/library-results";
import { ProduceTile } from "@/app/_components/produce-tile";
import { PageTitle, SpaceHeader } from "@/app/_components/space-header";
import { SpaceSwitcher } from "@/app/_components/space-switcher";
import { TitleMenu } from "@/app/_components/title-menu";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { ALL_RECIPES, loadBooks } from "@/app/_lib/load-books";
import { firstParam, type SearchParams } from "@/app/_lib/search-params";
import { getInjection } from "@/di/container";
import { hasRole } from "@/src/entities/models/space.model";

export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const search = firstParam(params.q);
  const tag = firstParam(params.tag);
  const group = firstParam(params.group);
  const requestedBook = firstParam(params.book);

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
  const library = showAll
    ? await getInjection("IGetAllRecipesController")({ tag }, userId)
    : await getInjection("IGetRecipesController")(
        { spaceId: current.id, tag },
        userId,
      );

  // In All recipes, New goes to your own book (the form offers the others).
  const canEdit = showAll || hasRole(current.role, "editor");
  const viewId = showAll ? ALL_RECIPES : current.id;
  const newHref = showAll ? "/recipes/new" : `/recipes/new?book=${current.id}`;
  const newButton = canEdit && (
    <Button size="lg" nativeButton={false} render={<Link href={newHref} />}>
      <Plus data-icon="inline-start" />
      New
    </Button>
  );
  // In the ⋯ sheet (D42): the Books page, to add a book or choose the default.
  const allBooks = (
    <Button
      variant="secondary"
      size="lg"
      nativeButton={false}
      render={<Link href="/books" />}
    >
      <Library data-icon="inline-start" />
      All books
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <SpaceSwitcher
        spaces={
          books.length > 1
            ? [{ id: ALL_RECIPES, name: "All recipes" }, ...books]
            : books
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
        // A new tag or address starts from its own search and grouping; typing and Group by
        // only update ?q= and ?group= in place.
        key={`${viewId}|${tag ?? ""}|${search ?? ""}|${group ?? ""}`}
        book={requestedBook}
        tags={library.tags}
        tagGroups={library.tagGroups}
        activeTag={tag}
        recipes={library.recipes}
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
          render={<Link href={`/books/${current.id}/copy`} />}
          className="self-center"
        >
          <Copy data-icon="inline-start" />
          Copy recipes to another book
        </Button>
      )}
    </div>
  );
}
