import { blockNow } from "@/app/_components/block-row";
import { BlockSheet } from "@/app/_components/block-sheet";
import { SectionTitle } from "@/app/_components/display";
import type { Block } from "@/src/entities/models/block.model";

// This week's Focus blocks (R9 as revised 2026-11-07, R26, docs/build-plan.md U17): today's, by
// start, each opening how it went, with how many are done of those planned (a moved one counts in
// neither). The block happening now takes the signal border.
export function TodayBlocks({ blocks, now }: { blocks: Block[]; now: Date }) {
  const current = blockNow(blocks, now);
  const planned = blocks.filter(({ state }) => state !== "moved");
  const done = planned.filter(({ state }) => state === "done").length;
  return (
    <section aria-labelledby="week-blocks" className="flex flex-col gap-3">
      <SectionTitle id="week-blocks">
        Today&apos;s blocks · {done} of {planned.length} done
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
