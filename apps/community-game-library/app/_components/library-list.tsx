import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import Link from "next/link";
import type { ReactNode } from "react";
import { LibraryControls } from "@/app/_components/library-controls";
import { List } from "@/app/_components/list-row";
import {
  countLine,
  type DropSuggestion,
  dropWords,
  type FilterableItem,
  filterWords,
  type LibraryView,
  type LibraryWhose,
  libraryViewSearch,
  noMatchLine,
  type OfferedFilters,
  ownerWordsFor,
  withoutFilter,
  withoutFilters,
} from "@/src/entities/library-filters";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

// One list for every library (U8; screens.md, each list's rows one component, so a friend's
// library sorts and filters like your own): Filter and Sort with the chips, the count line, then
// the rows, or B4 when the filters match nothing. A library with nothing in it shows its count
// and `empty`, with no controls (A7). From 768px the page's search field and views share one
// row with Filter and Sort (Wide1, Wide4): the search takes what's left of at least 280px, the
// views 260.
export function LibraryList({
  path,
  view,
  list,
  owners,
  viewerId,
  whose,
  sortInCount = true,
  search,
  views,
  between,
  empty,
  children,
}: {
  // The list's page: "/" for All friends, "/my-library".
  path: string;
  view: LibraryView;
  list: {
    total: number;
    shown: number;
    inView: FilterableItem[];
    offered: OfferedFilters;
    dropSuggestions: DropSuggestion[];
  };
  // The owners the owner filter offers, the member first.
  owners: NameAndPiece[];
  viewerId: string;
  // Whose library B4's line speaks of: everyone's on All friends, yours on My library, a
  // friend's on their page.
  whose: LibraryWhose;
  // Whether the count line says the sort while nothing filters it: B1's does, B6's doesn't.
  sortInCount?: boolean;
  // The page's search field and its views (All friends | My library), before the controls; a
  // friend's library (E3) has neither.
  search?: ReactNode;
  views?: ReactNode;
  // What sits between the controls and the count line (B6's Add a game and Lending).
  between?: ReactNode;
  empty: ReactNode;
  children: ReactNode;
}) {
  const href = (next: LibraryView) => `${path}${libraryViewSearch(next)}`;
  const ownerWords = ownerWordsFor(owners, viewerId);
  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-start">
        {search && (
          <div className="md:min-w-0 md:grow md:basis-70">{search}</div>
        )}
        {views && <div className="md:w-65">{views}</div>}
        {list.total > 0 && (
          <LibraryControls
            path={path}
            view={view}
            shown={list.shown}
            offered={list.offered}
            owners={owners}
            viewerId={viewerId}
            inView={list.inView}
          />
        )}
      </div>
      {between}
      <p className="font-mono text-xs font-medium text-muted-foreground">
        {countLine(list.shown, view, sortInCount && list.total > 0)}
      </p>
      {list.total === 0 ? (
        empty
      ) : list.shown === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No games match</EmptyTitle>
            <EmptyDescription>{noMatchLine(view, whose)}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {/* B4's ways out: a button for each filter whose dropping brings games back,
                most first, stacked 10px apart as the app stacks its buttons, then Clear
                filters 4px under them, as B4 draws it. A label too long for the box wraps,
                as the night page's What should we play? does. */}
            <div className="flex flex-col items-start gap-1">
              {list.dropSuggestions.length > 0 && (
                <div className="flex flex-col items-start gap-2.5">
                  {list.dropSuggestions.map(({ filter, count }) => {
                    const without = href(withoutFilter(view, filter));
                    return (
                      <Button
                        key={without}
                        variant="secondary"
                        nativeButton={false}
                        render={<Link href={without} scroll={false} />}
                      >
                        <span className="text-left leading-tight whitespace-normal">
                          {dropWords(filterWords(filter, ownerWords), count)}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              )}
              <Button
                variant="link"
                nativeButton={false}
                render={
                  <Link href={href(withoutFilters(view))} scroll={false} />
                }
              >
                Clear filters
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      ) : (
        <List browse>{children}</List>
      )}
    </>
  );
}
