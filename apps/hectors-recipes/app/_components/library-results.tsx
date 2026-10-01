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
import { matchesSearch } from "@/src/entities/library";
import type { Recipe } from "@/src/entities/models/recipe.model";

// The library's search, tag chips and cards (ux-plan P10.4). The page sends every card the
// tag allows; the search narrows them here as you type, by the same rule the server uses, and
// keeps ?q= in the address (replaced, not added to history) so Back and shared links still
// work. Server-rendered with the address's ?q=, the first view is already filtered.
export function LibraryResults({
  book,
  tags,
  activeTag,
  recipes,
  bookNames,
  empty,
}: {
  book: string | undefined;
  tags: string[];
  activeTag: string | undefined;
  recipes: Recipe[];
  // Each card's book, when the grid mixes books (All recipes).
  bookNames?: Record<string, string>;
  // What a book with no recipes shows: the page knows whether they can add one.
  empty: ReactNode;
}) {
  // From the address as it is now, not as the page was loaded: Back to a search typed here
  // brings the page back from before it was typed, with ?q= updated in place since.
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const shown = recipes.filter((recipe) => matchesSearch(recipe, search));

  function changeSearch(text: string) {
    setSearch(text);
    window.history.replaceState(
      null,
      "",
      libraryHref({ book, search: text.trim() || undefined, tag: activeTag }),
    );
  }

  return (
    <>
      <LibraryFilters
        book={book}
        tags={tags}
        activeTag={activeTag}
        search={search}
        onSearch={changeSearch}
      />
      {shown.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shown.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard
                recipe={recipe}
                bookName={bookNames?.[recipe.spaceId]}
              />
            </li>
          ))}
        </ul>
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
              variant="outline"
              size="lg"
              nativeButton={false}
              render={
                <Link
                  href={libraryHref({ book })}
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
