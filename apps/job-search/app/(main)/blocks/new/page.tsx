import { BlockForm } from "@/app/_components/block-form";
import { PageTitle } from "@/app/_components/display";
import { getPageActor } from "@/app/_lib/current-actor";

// Adding a Focus block (R26): one that's planned, or work that wasn't, already done.
export default async function NewBlockPage() {
  await getPageActor();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageTitle>Add a block</PageTitle>
      <BlockForm />
    </div>
  );
}
