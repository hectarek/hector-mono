import { cn } from "@repo/ui/lib/utils";
import Link from "next/link";
import { Children, type ReactNode } from "react";
import { ForwardIcon } from "@/app/_components/icons";

// One printed chipboard panel of rows, a dashed perforation between them (the design system's
// ListRow). A list someone browses (the library, adding games, a friend's library, picking
// games for a night) runs its rows in two columns from 768px and three from 1100px (KTD14,
// Wide0 to Wide4), perforated between columns too, with blank cells finishing the last line.
// Every other list stays one column at any width. 1100px is written min-[68.75rem]: Tailwind
// sorts a px breakpoint before md's rem one, so md's two columns would win.
export function List({
  browse = false,
  children,
}: {
  browse?: boolean;
  children: ReactNode;
}) {
  return (
    <ul
      className={cn(
        "flex flex-col rounded-lg border-2 border-foreground bg-card *:border-dashed *:border-foreground *:not-first:border-t-2",
        browse &&
          "md:grid md:grid-cols-2 md:*:even:border-l-2 md:*:nth-[-n+2]:border-t-0 min-[68.75rem]:grid-cols-3 min-[68.75rem]:*:border-l-2 min-[68.75rem]:*:nth-3:border-t-0 min-[68.75rem]:*:nth-[3n+1]:border-l-0",
      )}
    >
      {children}
      {browse && <Fillers rows={Children.count(children)} />}
    </ul>
  );
}

// The blank cells that finish a browsed list's last line, at two columns and at three.
function Fillers({ rows }: { rows: number }) {
  const atTwo = rows % 2;
  const atThree = (3 - (rows % 3)) % 3;
  const cells = [];
  for (let cell = 0; cell < Math.max(atTwo, atThree); cell += 1) {
    const two = cell < atTwo;
    const three = cell < atThree;
    cells.push(
      <li
        key={`filler-${cell}`}
        aria-hidden="true"
        className={cn(
          "hidden",
          two && "md:block",
          two && !three && "min-[68.75rem]:hidden",
          three && "min-[68.75rem]:block",
        )}
      />,
    );
  }
  return cells;
}

// A row that opens a page: one link filling the row, its chevron at the far right after any
// stamp (D14: the row shows the thing's state, its page changes it). The text stacks; a title
// that wraps takes the room, and a stamp that no longer fits beside it drops under it
// (screens.md rule 13). With a pointer, the row's ink turns stamp-red.
export function ListRow({
  href,
  thumb,
  stamp,
  aside,
  children,
}: {
  href: string;
  // Before the text: a CoverThumb, or a person's 20px piece.
  thumb?: ReactNode;
  stamp?: ReactNode;
  // A mono fact at the right ("4 games").
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-12 items-center gap-3 px-3 py-2.5 text-foreground hover:text-destructive focus-visible:-outline-offset-3"
      >
        {thumb}
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="flex min-w-0 flex-auto flex-col gap-0.5">
            {children}
          </span>
          {stamp}
        </span>
        {aside && (
          <span className="shrink-0 font-mono text-xs font-medium text-muted-foreground">
            {aside}
          </span>
        )}
        <ForwardIcon />
      </Link>
    </li>
  );
}

// A row with no page of its own, handled right there (a friend request's Accept, "I own it").
export function ListItem({ children }: { children: ReactNode }) {
  return <li className="flex items-center gap-3 px-3 py-2.5">{children}</li>;
}

// A row's parts: the name (15px bold; a title wraps, never cut short), the mono facts
// ("2–4 · 40 min"), and a 12px line that holds a piece and a name or the state.
export function RowName({ children }: { children: ReactNode }) {
  return <span className="text-15 font-bold">{children}</span>;
}

export function RowFacts({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-2xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

export function RowLine({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.25 text-xs whitespace-nowrap">
      {children}
    </span>
  );
}
