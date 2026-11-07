import { cn } from "@repo/ui/lib/utils";
import { DisplayLabel } from "@/app/_components/display";
import { formatTime } from "@/app/_lib/format-day";
import { BLOCK_STATE_LABELS, EFFORT_LABELS } from "@/app/_lib/job-labels";
import type { Block, BlockState } from "@/src/entities/models/block.model";

// A block's row: one tap target, 44 px or taller, that opens the block's sheet or page.
export const BLOCK_ROW =
  "hover:bg-accent focus-visible:outline-ring flex min-h-11 w-full items-start gap-3 px-3 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2";

// The row of the block happening now, which takes the signal border, one at a time (the design
// system's BlockRow). Spelled out whole: the design lint checks only static class strings.
export const NOW_ROW =
  "hover:bg-accent focus-visible:outline-ring ring-signal flex min-h-11 w-full items-start gap-3 px-3 py-3 text-left ring-2 ring-inset focus-visible:outline-2 focus-visible:-outline-offset-2";

// How each state reads: done in success, partly done in warning, moved and skipped muted.
const STATE_COLORS: Record<BlockState, string | undefined> = {
  planned: undefined,
  done: "text-success",
  partial: "text-warning",
  moved: "text-muted-foreground",
  skipped: "text-muted-foreground",
};

// The block happening now, if any: the first planned block whose time holds the moment given.
export function blockNow(blocks: Block[], now: Date): string | undefined {
  return blocks.find(
    ({ state, startsAt, endsAt }) =>
      state === "planned" && startsAt <= now && now < endsAt,
  )?.id;
}

// The design system's BlockRow, inside its row (R26, docs/build-plan.md U17): when the block
// starts, the effort it feeds, what it is, what makes it done, how it went and what happened.
export function BlockFace({ block, now }: { block: Block; now: boolean }) {
  return (
    <>
      <span className="text-muted-foreground w-18 shrink-0 font-mono text-sm">
        {formatTime(block.startsAt)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <DisplayLabel className="text-muted-foreground">
          {EFFORT_LABELS[block.effort]}
        </DisplayLabel>
        <span className="font-bold break-words">{block.title}</span>
        {block.doneWhen ? (
          <span className="text-muted-foreground text-sm break-words">
            Done when {block.doneWhen}
          </span>
        ) : null}
        {block.whatHappened ? (
          <span className="text-sm break-words">{block.whatHappened}</span>
        ) : null}
      </span>
      <DisplayLabel
        className={cn(
          "shrink-0 pt-0.5",
          now ? undefined : STATE_COLORS[block.state],
        )}
      >
        {now ? "Now" : BLOCK_STATE_LABELS[block.state]}
      </DisplayLabel>
    </>
  );
}
