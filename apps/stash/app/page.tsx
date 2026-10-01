import { Separator } from "@repo/ui/components/separator";
import { AddItemForm } from "@/app/_components/add-item-form";
import { Header } from "@/app/_components/header";
import { StashList } from "@/app/_components/stash-list";
import { getInjection } from "@/di/container";
import type { StashItem } from "@/src/entities/models/stash-item.model";

export const dynamic = "force-dynamic";

export default async function StashPage() {
  const authService = getInjection("IAuthenticationService");
  const session = await authService.getSession();
  const userId = session?.user.id ?? "";

  const stashData = await getStash(userId);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <AddItemForm />
        <Separator />
        <StashList queued={stashData.queued} completed={stashData.completed} />
      </main>
    </div>
  );
}

async function getStash(
  userId: string,
): Promise<{ queued: StashItem[]; completed: StashItem[] }> {
  const logger = getInjection("ILoggerService").child({
    layer: "page",
    op: "getStash",
  });

  try {
    const controller = getInjection("IGetStashItemsController");
    return await controller(userId);
  } catch (err) {
    logger.error("Failed to fetch stash", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { queued: [], completed: [] };
  }
}
