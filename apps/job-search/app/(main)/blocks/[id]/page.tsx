import { Button } from "@repo/ui/components/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { blockNow } from "@/app/_components/block-row";
import { BlockSheet } from "@/app/_components/block-sheet";
import { DeleteButton } from "@/app/_components/delete-button";
import { RecordTitle } from "@/app/_components/display";
import { OnlyHector } from "@/app/_components/only-hector";
import { RecordHistory } from "@/app/_components/record-history";
import { getPageActor } from "@/app/_lib/current-actor";
import { formatDay, formatWeekday } from "@/app/_lib/format-day";
import { loadBlock } from "@/app/_lib/load-block";
import { deleteBlock } from "@/app/actions/blocks";
import { mondayOf } from "@/src/entities/week";

// A Focus block (R26, docs/build-plan.md U17): its day, its row, which opens how it went, and its
// history (R19). Editing its plan opens its form; deleting it is Hector's alone (KTD3).
export default async function BlockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getPageActor();
  const { id } = await params;
  const block = await loadBlock(id, actor);
  const human = actor.actor === "owner";
  // Read after the session: the block happening now takes the signal border.
  const now = blockNow([block], new Date()) === block.id;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href={`/week?week=${mondayOf(block.day)}`}
          className="text-muted-foreground flex min-h-11 w-fit items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Weekly review
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <RecordTitle className="break-words">{block.title}</RecordTitle>
            <p className="text-muted-foreground text-sm">
              {formatWeekday(block.day)}, {formatDay(block.day)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="lg"
              nativeButton={false}
              render={<Link href={`/blocks/${block.id}/edit`} />}
              className="min-h-11"
            >
              Edit
            </Button>
            {human ? (
              <DeleteButton
                what="this block"
                action={deleteBlock.bind(null, { id: block.id })}
                then="/week"
              />
            ) : (
              <OnlyHector labels={["Delete"]} />
            )}
          </div>
        </div>
      </div>

      <div className="bg-card overflow-hidden rounded-xl border">
        <BlockSheet block={block} now={now} />
      </div>

      <RecordHistory record={{ kind: "block", id: block.id }} />
    </div>
  );
}
