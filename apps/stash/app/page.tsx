import { Separator } from "@repo/ui/components/separator";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Suspense } from "react";
import { AddItemForm } from "@/app/_components/add-item-form";
import { Header } from "@/app/_components/header";
import { StashList } from "@/app/_components/stash-list";
import { getInjection } from "@/di/container";
import type { StashItem } from "@/src/entities/models/stash-item.model";

// The header and the form are the same for everyone, so they're in the prerendered shell;
// the list reads the session, so it streams in behind its skeleton.
export default function StashPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <AddItemForm />
        <Separator />
        <Suspense fallback={<StashListSkeleton />}>
          <UserStash />
        </Suspense>
      </main>
    </div>
  );
}

async function UserStash() {
  const authService = getInjection("IAuthenticationService");
  const session = await authService.getSession();
  const userId = session?.user.id ?? "";

  const stashData = await getStash(userId);

  return (
    <StashList queued={stashData.queued} completed={stashData.completed} />
  );
}

function StashListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
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
