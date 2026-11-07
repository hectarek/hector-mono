import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import { BLOCK_ROW, BlockFace } from "@/app/_components/block-row";
import { DisplayLabel } from "@/app/_components/display";
import { withFrom } from "@/app/_lib/back-link";
import { formatWeekday } from "@/app/_lib/format-day";
import { EFFORT_LABELS } from "@/app/_lib/job-labels";
import type { BlocksWeek } from "@/src/entities/models/block.model";

// The week's Focus blocks on the week page (R26, docs/build-plan.md U17): each effort's blocks done
// and partly done against those planned, then the blocks by day, each opening its page, whose back
// link returns to `from`, the week page as it is (the UX plan's UX8).
export function WeekBlocks({ week, from }: { week: BlocksWeek; from: string }) {
  const days = [...new Set(week.blocks.map(({ day }) => day))];
  return (
    <div className="flex flex-col gap-4">
      {week.efforts.length ? (
        <ul className="flex flex-col gap-1">
          {week.efforts.map(({ effort, done, partial, planned }) => (
            <li key={effort} className="flex items-baseline gap-3">
              <DisplayLabel className="text-muted-foreground w-28 shrink-0">
                {EFFORT_LABELS[effort]}
              </DisplayLabel>
              <span className="font-mono text-sm">
                {done} of {planned} done
                {partial ? ` · ${partial} partly` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No blocks this week.</p>
      )}
      {days.map((day) => (
        <section key={day} className="flex flex-col gap-2">
          <DisplayLabel className="text-muted-foreground">
            {formatWeekday(day)}
          </DisplayLabel>
          <ul className="bg-card divide-y overflow-hidden rounded-xl border">
            {week.blocks
              .filter((block) => block.day === day)
              .map((block) => (
                <li key={block.id}>
                  <Link
                    href={withFrom(`/blocks/${block.id}`, from)}
                    className={BLOCK_ROW}
                  >
                    <BlockFace block={block} now={false} />
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <Button
        variant="secondary"
        size="lg"
        nativeButton={false}
        render={<Link href="/blocks/new" />}
        className="min-h-11 w-fit"
      >
        Add a block
      </Button>
    </div>
  );
}
