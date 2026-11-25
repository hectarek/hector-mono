import { cn } from "@repo/ui/lib/utils";

// How many things wait on the member behind a tab, or unread lines behind the bell (D14): an
// 18px red badge with a white number, ringed in the color of the ground under it. It sits at
// the top right of its tab's icon or of the bell, or in a list row (E5's Admin). Its parent says the count in its own name
// ("Loans, 2 waiting"), so the badge is hidden from screen readers, and nothing draws when
// nothing waits.
export function TabCount({
  count,
  on,
}: {
  count: number;
  // A tab sits on chipboard; the bell on kraft on a phone, and in the chipboard header from 768;
  // a row on chipboard.
  on: "tab" | "bell-on-kraft" | "bell-on-chipboard" | "row";
}) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full border-2 bg-destructive px-0.75 font-mono text-10 font-medium text-white",
        on !== "row" && "col-start-1 row-start-1 self-start justify-self-end",
        on === "row" && "border-card",
        on === "tab" && "-mt-0.75 mr-0.5 border-card",
        on === "bell-on-kraft" && "-mt-1.75 -mr-1.75 border-background",
        on === "bell-on-chipboard" && "-mt-1.75 -mr-1.75 border-card",
      )}
    >
      {count}
    </span>
  );
}
