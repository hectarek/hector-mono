import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { WEEKLY_COUNTS } from "@/src/entities/models/settings.model";
import type { TodayView } from "@/src/entities/models/today.model";

// The week's counts so far beside Hector's targets (R9, R10): "2 of 10", or the count alone where
// he set no target.
export function WeekCounts({
  counts,
  targets,
}: Pick<TodayView, "counts" | "targets">) {
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
        </div>
      ))}
    </dl>
  );
}
