import { cn } from "@repo/ui/lib/utils";
import type { ComponentProps } from "react";

// The design system's display layer: Saira, set wide, heavy and uppercase, for a screen's title,
// its section labels, codes and the pit board. Never for a sentence, and never for a real name,
// which reads in Atkinson.

export function PageTitle({ className, ...props }: ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "font-heading font-stretch-118% text-3xl font-extrabold uppercase",
        className,
      )}
      {...props}
    />
  );
}

// A section's label: the system's `label` style in muted-foreground.
export function SectionTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "font-heading font-stretch-118% text-muted-foreground text-2xs font-bold tracking-widest uppercase",
        className,
      )}
      {...props}
    />
  );
}

// The `label` style anywhere else: a code, a status, when a task is due.
export function DisplayLabel({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "font-heading font-stretch-118% text-2xs font-bold tracking-widest uppercase",
        className,
      )}
      {...props}
    />
  );
}

// A record's name at the top of its page: a job's role, a company, a person, a practice topic.
export function RecordTitle({ className, ...props }: ComponentProps<"h1">) {
  return (
    <h1
      className={cn("text-2xl font-bold tracking-tight", className)}
      {...props}
    />
  );
}

// The brand's one shape: a sector cut at the slant (the design system's sector-slant, −18°), as
// the mark at the head of a notice. An SVG, so it takes a notice's icon slot; its color is a
// fill class (fill-info, fill-warning).
export function SectorMark({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path d="M7.45 2H12.45L8.55 14H3.55Z" />
    </svg>
  );
}

// Four empty sectors in a row, the design system's mark for a list with nothing in it yet.
const EMPTY_SECTORS = ["s1", "s2", "s3", "s4"];

export function EmptySectors() {
  return (
    <span aria-hidden="true" className="flex gap-0.5">
      {EMPTY_SECTORS.map((sector) => (
        <span
          key={sector}
          className="ring-ghost h-3 w-2 -skew-x-18 ring-1 ring-inset"
        />
      ))}
    </span>
  );
}
