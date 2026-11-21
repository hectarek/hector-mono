import type { ReactNode } from "react";

// How everything on a page is grouped (the design system's Group): a chipboard panel with a red
// stencil label inside it, or, above a list, a navy stencil label on kraft. Fields, switches and
// facts never sit loose on kraft, and a button sits inside the group it acts on. Groups sit 12px
// apart (PageColumn). An empty state is @repo/ui's Empty, which the theme draws punched out.
export function Group({
  label,
  aside,
  overList = false,
  children,
}: {
  label: string;
  // Beside the label on the right, such as the loan's stamp.
  aside?: ReactNode;
  // A navy label on kraft, directly above a list, rather than a panel.
  overList?: boolean;
  children: ReactNode;
}) {
  if (overList) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="mt-1 font-heading text-15 font-bold tracking-wider uppercase">
          {label}
        </h2>
        {children}
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-2 rounded-lg border-2 border-foreground bg-card px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-15 font-bold tracking-wider text-destructive uppercase">
          {label}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
