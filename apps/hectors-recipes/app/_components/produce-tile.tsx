import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

// The design system's bold moment: a flat produce fill (chart-1..5) with dark ink.
export type Produce = "tomato" | "carrot" | "lemon" | "basil" | "plum";

const FILL: Record<Produce, string> = {
  tomato: "bg-chart-1",
  carrot: "bg-chart-2",
  lemon: "bg-chart-3",
  basil: "bg-chart-4",
  plum: "bg-chart-5",
};
const PRODUCE = Object.keys(FILL) as Produce[];

// The same id always gets the same colour, so a recipe is recognisable by it.
export function produceFor(id: string): Produce {
  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return PRODUCE[hash % PRODUCE.length] ?? "basil";
}

export function ProduceTile({
  produce,
  className,
  children,
}: {
  produce: Produce;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn("text-chart-foreground flex", FILL[produce], className)}
    >
      {children}
    </div>
  );
}
