import { DisplayLabel } from "@/app/_components/display";
import type { BlocksDone } from "@/src/entities/models/block.model";

// The week's line at the top of Today (R9's first section as revised 2026-11-10): the week's
// applications against Hector's target, its milestone, left out until planning sets it (R10 as
// revised), and its Focus blocks done against those planned, left out while none are planned.
export function WeekLine({
  applications,
  target,
  milestone,
  blocks,
}: {
  applications: number;
  target: number | null;
  milestone: string | null;
  blocks: BlocksDone;
}) {
  return (
    <section aria-label="This week">
      <dl className="flex flex-wrap gap-x-6 gap-y-1">
        <Fact label="Applications" value={applications} of={target} />
        {milestone ? (
          <div className="flex min-w-0 items-baseline gap-2">
            <dt>
              <DisplayLabel className="text-muted-foreground">
                Milestone
              </DisplayLabel>
            </dt>
            <dd className="font-semibold">{milestone}</dd>
          </div>
        ) : null}
        {blocks.planned ? (
          <Fact label="Blocks done" value={blocks.done} of={blocks.planned} />
        ) : null}
      </dl>
    </section>
  );
}

// A count, against what it's measured by when there's one, as a timing screen writes it: 2/5.
function Fact({
  label,
  value,
  of,
}: {
  label: string;
  value: number;
  of: number | null;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt>
        <DisplayLabel className="text-muted-foreground">{label}</DisplayLabel>
      </dt>
      <dd className="font-mono font-semibold tabular-nums">
        {value}
        {of === null ? null : (
          <span className="text-muted-foreground font-normal">/{of}</span>
        )}
      </dd>
    </div>
  );
}
