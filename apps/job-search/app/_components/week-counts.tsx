import { cn } from "@repo/ui/lib/utils";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import {
  type Settings,
  WEEKLY_COUNTS,
} from "@/src/entities/models/settings.model";
import type { WeeklyCounts } from "@/src/entities/weekly-counts";

// Each count's code in the display layer, as a timing tower names its rows.
const CODES: Record<(typeof WEEKLY_COUNTS)[number], string> = {
  messagesSent: "MSG",
  conversationsHeld: "CONV",
  applications: "APPL",
  practiceSessions: "PRAC",
  screensReached: "SCRN",
};

// The most ticks a row draws; a bigger target fills them in proportion.
const MAX_TICKS = 20;

// A week's counts beside Hector's targets (R9, R10), as the design system's timing tower: a row
// per count, one tick per unit of its target, the count against the target, or the count alone
// where he set none. Given the live counts too, as a saved review's snapshot is, a count that no
// longer matches shows its number now beside it.
export function WeekCounts({
  counts,
  targets,
  live,
}: {
  counts: WeeklyCounts;
  targets: Settings["targets"];
  live?: WeeklyCounts;
}) {
  return (
    <dl className="bg-card divide-y overflow-hidden rounded-xl border">
      {WEEKLY_COUNTS.map((count) => {
        const target = targets[count];
        const value = counts[count];
        return (
          <div key={count} className="flex min-h-11 items-center gap-3 px-3">
            <dt className="w-12 shrink-0">
              <span
                aria-hidden="true"
                className="font-heading font-stretch-118% text-2xs font-extrabold tracking-widest"
              >
                {CODES[count]}
              </span>
              <span className="sr-only">{FIELD_LABELS[count] ?? count}</span>
            </dt>
            <dd className="min-w-0 flex-1">
              {target === null ? (
                <span className="text-muted-foreground text-sm">No target</span>
              ) : (
                <Ticks value={value} target={target} />
              )}
            </dd>
            <dd className="font-mono w-16 shrink-0 text-right font-semibold tabular-nums">
              {value}
              {target === null ? null : (
                <span className="text-muted-foreground text-sm font-normal">
                  /{target}
                </span>
              )}
            </dd>
            {live && live[count] !== value ? (
              <dd className="text-muted-foreground shrink-0 text-sm">
                Now {live[count]}
              </dd>
            ) : null}
          </div>
        );
      })}
    </dl>
  );
}

// One element per tick, since the design lint allows no inline styles. Filled ticks are
// foreground, and success once the target is met; empty ones are border. Pace against last
// week's ghost comes later.
function Ticks({ value, target }: { value: number; target: number }) {
  const ticks = Math.min(target, MAX_TICKS);
  const filled = Math.min(ticks, Math.round((value / target) * ticks));
  const units = Array.from({ length: ticks }, (_, i) => i + 1);
  return (
    <span
      aria-hidden="true"
      className="grid h-3 auto-cols-fr grid-flow-col gap-0.75"
    >
      {units.map((unit) => (
        <span
          key={unit}
          className={cn(
            "rounded-xs",
            unit <= filled
              ? value >= target
                ? "bg-success"
                : "bg-foreground"
              : "bg-border",
          )}
        />
      ))}
    </span>
  );
}
