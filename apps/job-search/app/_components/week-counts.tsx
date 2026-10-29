import { FIELD_LABELS } from "@/app/_lib/field-labels";
import {
  type Settings,
  WEEKLY_COUNTS,
} from "@/src/entities/models/settings.model";
import type { WeeklyCounts } from "@/src/entities/weekly-counts";

// A week's counts beside Hector's targets (R9, R10): "2 of 10", or the count alone where he set no
// target. Given the live counts too, as a saved review's snapshot is, each count that no longer
// matches shows its number now beside it.
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
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {WEEKLY_COUNTS.map((count) => (
        <div key={count} className="flex flex-col gap-1 rounded-lg border p-3">
          <dt className="text-muted-foreground text-sm">
            {FIELD_LABELS[count] ?? count}
          </dt>
          <dd className="text-lg font-semibold tabular-nums">
            {targets[count] === null
              ? counts[count]
              : `${counts[count]} of ${targets[count]}`}
          </dd>
          {live && live[count] !== counts[count] ? (
            <dd className="text-muted-foreground text-sm">Now {live[count]}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
