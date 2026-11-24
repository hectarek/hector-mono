"use client";

import { cn } from "@repo/ui/lib/utils";
import { Piece } from "@/app/_components/piece";
import { useMoment } from "@/app/_lib/use-moment";
import type { PieceColor, PieceShape } from "@/src/entities/piece";

export type TrackSpace = {
  // What tells the space apart when a label repeats (a week-long loan starts and ends on a
  // Tuesday): its day, by default its label.
  id?: string;
  // "TUE", or "WK 2" for a loan longer than a week; "+1" for a late space.
  label: string;
  due?: boolean;
  // Past the due day: a dashed red space after it, where the piece then stands.
  late?: boolean;
};

// The days of a loan (D13, the design system's Track): a row of spaces, the borrower's piece
// standing on today with the word "today" under it, and the due space red. Up to a week is a
// space a day, longer a space a week; the loan's own page works the spaces out (loan-track,
// U13). The caller writes the dates under it ("Picked up Fri, Nov 6 · 1 week"), so it's hidden
// from screen readers. Its red sits on chipboard, so it goes inside a panel. Given the `day`, it
// moves with it: when a day passes while the page shows (a page brought up to date from the
// phone's copy, or open past midnight), the piece hops onto today's space from the one before
// (U26's piece hop).
export function Track({
  spaces,
  today,
  borrower,
  day,
}: {
  spaces: TrackSpace[];
  // Which space the piece stands on.
  today: number;
  borrower: { shape: PieceShape; color: PieceColor };
  // Today's date (YYYY-MM-DD), on the loan's own page.
  day?: string;
}) {
  const hop = useMoment(day, (before, now) =>
    Boolean(before && now && now > before),
  );
  return (
    <div aria-hidden="true" className="flex flex-col gap-0.5">
      <div className="flex">
        {spaces.map((space, index) => (
          <span
            key={
              index === today
                ? `${space.id ?? space.label}-${hop.key}`
                : (space.id ?? space.label)
            }
            data-moment={index === today && hop.playing ? "hop" : undefined}
            className="flex flex-1 justify-center"
          >
            {index === today && (
              <Piece shape={borrower.shape} color={borrower.color} size={16} />
            )}
          </span>
        ))}
      </div>
      <div className="flex">
        {spaces.map((space) => (
          <span
            key={space.id ?? space.label}
            className={cn(
              "flex h-5.5 flex-1 items-center justify-center border-2 border-l-0 border-foreground font-mono text-10 font-medium first:border-l-2",
              space.late
                ? "border-l-2 border-dashed border-destructive text-destructive"
                : space.due
                  ? "bg-destructive text-white"
                  : "bg-secondary",
            )}
          >
            {space.label}
          </span>
        ))}
      </div>
      <div className="flex">
        {spaces.map((space, index) => (
          <span
            key={space.id ?? space.label}
            className="flex flex-1 justify-center font-mono text-10 font-medium text-muted-foreground"
          >
            {index === today && "today"}
          </span>
        ))}
      </div>
    </div>
  );
}
