"use client";

import { Button } from "@repo/ui/components/button";
import { Toggle } from "@repo/ui/components/toggle";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FilterSheet } from "@/app/_components/filter-sheet";
import { CloseIcon, FilterIcon } from "@/app/_components/icons";
import { ShareButton } from "@/app/_components/share-button";
import { SortSheet } from "@/app/_components/sort-sheet";
import {
  activeFilters,
  type FilterableItem,
  filterWords,
  type LibraryView,
  libraryViewSearch,
  type OfferedFilters,
  ownerWordsFor,
  SORT_WORDS,
  withoutFilter,
  withoutFilters,
} from "@/src/entities/library-filters";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

// The library's controls (B1, B3; KIT 4a's one order): Filter and Sort, then a chip for each
// filter that's on, which a tap takes off, then Clear filters and Share these filters while
// something filters the list and it shows games. Each change goes into the page's address
// (R13), so Back returns to the view before and a filtered view can be shared.
export function LibraryControls({
  path,
  view,
  shown,
  offered,
  owners,
  viewerId,
  inView,
}: {
  // The list's page: "/" for All friends, "/my-library".
  path: string;
  view: LibraryView;
  shown: number;
  offered: OfferedFilters;
  // The owners as the filter offers them, the member first.
  owners: NameAndPiece[];
  viewerId: string;
  inView: FilterableItem[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<LibraryView | null>(null);
  const [sorting, setSorting] = useState(false);
  // The shared link is the whole address, read once the page is in the browser.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const go = (next: LibraryView) =>
    router.push(`${path}${libraryViewSearch(next)}`, { scroll: false });
  const filters = activeFilters(view);
  const ownerWords = ownerWordsFor(owners, viewerId);
  const chips = filters.map((filter) => ({
    filter,
    words: filterWords(filter, ownerWords),
  }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" onClick={() => setDraft(view)}>
        <FilterIcon data-icon="inline-start" />
        Filter
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setSorting(true)}
      >
        Sort: {SORT_WORDS[view.sort].button}
      </Button>
      {chips.map(({ filter, words }) => (
        <Toggle
          key={words}
          pressed
          onPressedChange={() => go(withoutFilter(view, filter))}
        >
          {words}
          <CloseIcon className="size-3.5" strokeWidth={2.6} />
        </Toggle>
      ))}
      {chips.length > 0 && shown > 0 && (
        <>
          <Button
            type="button"
            variant="link"
            onClick={() => go(withoutFilters(view))}
          >
            Clear filters
          </Button>
          <ShareButton
            label="Share these filters"
            text={`Games on our shelves: ${chips.map(({ words }) => words).join(" · ")}`}
            url={`${origin}${path}${libraryViewSearch(view)}`}
            copied="Link copied"
          />
        </>
      )}
      <FilterSheet
        draft={draft}
        onDraft={(change) => setDraft((current) => current && change(current))}
        onClose={() => setDraft(null)}
        onShow={(next) => {
          setDraft(null);
          go(next);
        }}
        offered={offered}
        owners={owners.map((owner) =>
          owner.userId === viewerId ? { ...owner, name: "You" } : owner,
        )}
        inView={inView}
      />
      <SortSheet
        open={sorting}
        onOpenChange={setSorting}
        sort={view.sort}
        onSort={(sort) => go({ ...view, sort })}
      />
    </div>
  );
}
