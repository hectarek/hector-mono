"use client";

import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { LibraryFilters } from "@/app/_components/library-filters";
import { ProduceTile } from "@/app/_components/produce-tile";
import { RecipeCard } from "@/app/_components/recipe-card";
import { libraryHref } from "@/app/_lib/library-href";
import { viewedAt as readViewedAt } from "@/app/_lib/recently-viewed";
import {
  groupRecipes,
  isLibraryOrder,
  type LibraryOrder,
  orderRecipes,
  recipeCountText,
  searchRecipes,
} from "@/src/entities/library";
import type { ListedRecipe } from "@/src/entities/models/recipe.model";
import {
  isTagCategory,
  type TagCategory,
  type TagGroups,
} from "@/src/entities/models/tag.model";

// The library's search, Sort and group, chips and cards (ux-plan P10.4, D57, D80). The page
// sends every card the tag (and the Saved chip) allows; here they're put in order (saved first
// by default, D77), narrowed as you type by the same rule the server uses, and grouped under
// headings. The address (?q=, ?sort=, ?group=) is kept up to date, replaced rather than added
// to history, so Back and shared links still work. Server-rendered from the address, the first
// view is already filtered and grouped; Recently viewed, kept on the device (D76), orders once
// the page has loaded.
export function LibraryResults({
  book,
  tags,
  tagGroups,
  activeTag,
  recipes,
  total,
  saved,
  savedOnly,
  bookNames,
  empty,
}: {
  book: string | undefined;
  tags: string[];
  tagGroups: TagGroups;
  activeTag: string | undefined;
  recipes: ListedRecipe[];
  // The book's count before the tag and search narrow it (P23.2).
  total: number;
  // This person's saved recipes (D77).
  saved: string[];
  // Only saved recipes are shown (?saved=1).
  savedOnly: boolean;
  // Each card's book, when the grid mixes books (All recipes).
  bookNames?: Record<string, string>;
  // What a book with no recipes shows: the page knows whether they can add one.
  empty: ReactNode;
}) {
  // From the address as it is now, not as the page was loaded: Back to a search typed here
  // brings the page back from before it was typed, with ?q= updated in place since.
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [group, setGroup] = useState(() => {
    const value = searchParams.get("group");
    return isTagCategory(value) ? value : undefined;
  });
  const [order, setOrder] = useState<LibraryOrder>(() => {
    const value = searchParams.get("sort");
    return isLibraryOrder(value) ? value : "saved";
  });
  const [viewedAt, setViewedAt] = useState<Record<string, number>>({});
  useEffect(() => setViewedAt(readViewedAt()), []);

  const shown = searchRecipes(
    orderRecipes(recipes, order, { saved, viewedAt }),
    search,
  );

  function replaceAddress(
    text: string,
    next: { order: LibraryOrder; group: TagCategory | undefined },
  ) {
    window.history.replaceState(
      null,
      "",
      libraryHref({
        book,
        search: text.trim() || undefined,
        tag: activeTag,
        saved: savedOnly,
        sort: next.order === "saved" ? undefined : next.order,
        group: next.group,
      }),
    );
  }

  function changeSearch(text: string) {
    setSearch(text);
    replaceAddress(text, { order, group });
  }

  // One control for both (D80): a grouping keeps the default order inside its headings.
  function changeArrangement(value: string) {
    const next = isTagCategory(value)
      ? { order: "saved" as const, group: value }
      : { order: isLibraryOrder(value) ? value : "saved", group: undefined };
    setOrder(next.order);
    setGroup(next.group);
    replaceAddress(search, next);
  }

  const savedIds = new Set(saved);
  const cards = (list: ListedRecipe[]) => (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {list.map((recipe) => (
        <li key={recipe.id}>
          <RecipeCard
            recipe={recipe}
            bookName={bookNames?.[recipe.spaceId]}
            saved={savedIds.has(recipe.id)}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <LibraryFilters
        book={book}
        tags={tags}
        activeTag={activeTag}
        search={search}
        onSearch={changeSearch}
        order={order}
        group={group}
        onArrange={changeArrangement}
        savedOnly={savedOnly}
        showSaved={saved.length > 0 || savedOnly}
      />
      {shown.length > 0 && (
        <p className="text-muted-foreground -mb-2 text-sm">
          {recipeCountText(shown.length, total)}
        </p>
      )}
      {shown.length > 0 && group ? (
        <div className="flex flex-col gap-6">
          {groupRecipes(shown, group, tagGroups).map(
            ({ tag, recipes: grouped }) => (
              <section
                key={tag ?? ""}
                aria-label={tag ?? "Other"}
                className="flex flex-col gap-2"
              >
                <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {tag ?? "Other"}
                </h2>
                {cards(grouped)}
              </section>
            ),
          )}
        </div>
      ) : shown.length > 0 ? (
        cards(shown)
      ) : recipes.length === 0 && !activeTag && !savedOnly ? (
        empty
      ) : (
        <Empty className="my-6">
          <EmptyHeader>
            <ProduceTile
              produce="tomato"
              className="size-12 -rotate-4 items-center justify-center rounded-xl"
            >
              <BookOpen className="size-6" />
            </ProduceTile>
            <EmptyTitle>No recipes match</EmptyTitle>
            <EmptyDescription>
              Try a different search, or clear the tag or Saved.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="secondary"
              size="lg"
              nativeButton={false}
              render={
                <Link
                  href={libraryHref({
                    book,
                    sort: order === "saved" ? undefined : order,
                    group,
                  })}
                  onClick={() => setSearch("")}
                />
              }
            >
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </>
  );
}
