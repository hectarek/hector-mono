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
import { type ReactNode, useState } from "react";
import { LibraryFilters } from "@/app/_components/library-filters";
import { ProduceTile } from "@/app/_components/produce-tile";
import { RecipeCard } from "@/app/_components/recipe-card";
import { libraryHref } from "@/app/_lib/library-href";
import { groupRecipes, searchRecipes } from "@/src/entities/library";
import type { ListedRecipe } from "@/src/entities/models/recipe.model";
import {
  isTagCategory,
  type TagCategory,
  type TagGroups,
} from "@/src/entities/models/tag.model";

// The library's search, Group by, tag chips and cards (ux-plan P10.4, D57). The page sends
// every card the tag allows; the search narrows them here as you type, by the same rule the
// server uses, and Group by puts them under headings. Both keep the address (?q=, ?group=)
// up to date, replaced rather than added to history, so Back and shared links still work.
// Server-rendered from the address, the first view is already filtered and grouped.
export function LibraryResults({
  book,
  tags,
  tagGroups,
  activeTag,
  recipes,
  bookNames,
  empty,
}: {
  book: string | undefined;
  tags: string[];
  tagGroups: TagGroups;
  activeTag: string | undefined;
  recipes: ListedRecipe[];
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
  const shown = searchRecipes(recipes, search);

  function replaceAddress(text: string, nextGroup: TagCategory | undefined) {
    window.history.replaceState(
      null,
      "",
      libraryHref({
        book,
        search: text.trim() || undefined,
        tag: activeTag,
        group: nextGroup,
      }),
    );
  }

  function changeSearch(text: string) {
    setSearch(text);
    replaceAddress(text, group);
  }

  function changeGroup(value: string) {
    const nextGroup = isTagCategory(value) ? value : undefined;
    setGroup(nextGroup);
    replaceAddress(search, nextGroup);
  }

  const cards = (list: ListedRecipe[]) => (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {list.map((recipe) => (
        <li key={recipe.id}>
          <RecipeCard recipe={recipe} bookName={bookNames?.[recipe.spaceId]} />
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
        group={group}
        onGroup={changeGroup}
      />
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
      ) : recipes.length === 0 && !activeTag ? (
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
              Try a different search or clear the tag.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="secondary"
              size="lg"
              nativeButton={false}
              render={
                <Link
                  href={libraryHref({ book, group })}
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
