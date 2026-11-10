import { blockNow } from "@/app/_components/block-row";
import { BlockSheet } from "@/app/_components/block-sheet";
import { SectionTitle } from "@/app/_components/display";
import { type Block, blocksDone } from "@/src/entities/models/block.model";

// Today's schedule (R9's third section as revised 2026-11-10, R26, docs/build-plan.md U17): today's
// Focus blocks by start, each opening how it went, with how many are done of those planned (a
// moved one counts in neither). The block happening now takes the signal border. The calendar's
// events join it with U14.
export function TodayBlocks({ blocks, now }: { blocks: Block[]; now: Date }) {
  const current = blockNow(blocks, now);
  const { done, planned } = blocksDone(blocks);
  return (
    <section aria-labelledby="today-schedule" className="flex flex-col gap-3">
      <SectionTitle id="today-schedule">
        Schedule · {done} of {planned} done
      </SectionTitle>
      <ul className="bg-card divide-y overflow-hidden rounded-xl border">
        {blocks.map((block) => (
          <li key={block.id}>
            <BlockSheet block={block} now={block.id === current} />
          </li>
        ))}
      </ul>
    </section>
  );
}
