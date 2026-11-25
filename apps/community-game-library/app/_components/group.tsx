import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

// How everything on a page is grouped (the design system's Group): a chipboard panel with a red
// stencil label inside it, or, above a list, a navy stencil label on kraft. Fields, switches and
// facts never sit loose on kraft, and a button sits inside the group it acts on. Groups sit 12px
// apart (PageColumn). An empty state is @repo/ui's Empty, which the theme draws punched out.
export function Group({
  label,
  aside,
  overList = false,
  roomy = false,
  id,
  children,
}: {
  label: string;
  // Beside the label on the right, such as the loan's stamp.
  aside?: ReactNode;
  // A navy label on kraft, directly above a list, rather than a panel.
  overList?: boolean;
  // A form's panel sets its fields 12px apart rather than 8px (D5, G3).
  roomy?: boolean;
  // The label's id, for a link that jumps to the group (B5's "See copies").
  id?: string;
  children: ReactNode;
}) {
  // A list's label sits 4px further from what's above it, but not at the top of a page (C4).
  if (overList) {
    return (
      <section className="mt-1 flex flex-col gap-3 first:mt-0">
        <h2
          id={id}
          className="scroll-mt-4 font-heading text-15 font-bold tracking-wider uppercase"
        >
          {label}
        </h2>
        {children}
      </section>
    );
  }
  return (
    <section
      className={cn(
        "flex flex-col rounded-lg border-2 border-foreground bg-card px-3.5 py-3",
        roomy ? "gap-3" : "gap-2",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id={id}
          className="scroll-mt-4 font-heading text-15 font-bold tracking-wider text-destructive uppercase"
        >
          {label}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
