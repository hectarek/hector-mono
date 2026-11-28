import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";
import { formatDollars } from "@/src/finance/format";

// Everything under the headline sentence: the parts, the chart and the table. While a field
// is empty or out of range it keeps its height, so the page doesn't jump, but hides its
// numbers (visibility: hidden), so no stale figure can be seen or read (R16, KTD12).
export function ResultBody({
  hidden,
  children,
}: {
  hidden: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-8", hidden && "invisible")}>{children}</div>
  );
}

type Part = { label: string; amount: number };

// How the total is built (R14, D7). The amounts are whole dollars that already add up to the
// total (allocateRounded), so the sum shown here is the total the sentence states.
export function ResultParts({
  parts,
  totalLabel,
}: {
  parts: readonly Part[];
  totalLabel: string;
}) {
  const total = parts.reduce((sum, part) => sum + part.amount, 0);
  return (
    <dl className="divide-y rounded-lg border">
      {parts.map((part, index) => (
        <div key={part.label} className="flex justify-between gap-4 px-4 py-3">
          <dt>{part.label}</dt>
          <dd className="text-right font-semibold tabular-nums">
            {index > 0 && (part.amount < 0 ? "− " : "+ ")}
            {formatDollars(Math.abs(part.amount))}
          </dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 bg-muted px-4 py-3">
        <dt className="font-semibold">{totalLabel}</dt>
        <dd className="text-right font-semibold tabular-nums">
          = {formatDollars(total)}
        </dd>
      </div>
    </dl>
  );
}
