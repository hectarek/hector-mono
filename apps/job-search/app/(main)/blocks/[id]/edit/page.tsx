import { BlockForm } from "@/app/_components/block-form";
import { RecordTitle } from "@/app/_components/display";
import { getPageActor } from "@/app/_lib/current-actor";
import { loadBlock } from "@/app/_lib/load-block";

// Changing a Focus block's plan, or how it went (R26).
export default async function EditBlockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getPageActor();
  const { id } = await params;
  const block = await loadBlock(id, actor);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <RecordTitle className="break-words">Edit {block.title}</RecordTitle>
      <BlockForm block={block} />
    </div>
  );
}
