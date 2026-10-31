import { Skeleton } from "@repo/ui/components/skeleton";
import { SkeletonMotion } from "@/app/_components/page-motion";
import { placeholders } from "@/app/_lib/placeholders";

// A shared recipe's shape while it loads: the logo, the photo, the title and the first lines.
export default function Loading() {
  return (
    <SkeletonMotion>
      <main className="pt-safe-6 mx-auto flex w-full max-w-3xl flex-col gap-6 px-4">
        <div role="status" aria-busy="true" className="flex flex-col gap-6">
          <span className="sr-only">Loading</span>
          <Skeleton className="h-5 w-40" />
          <div className="flex flex-col gap-3">
            <div className="aspect-video overflow-hidden rounded-xl">
              <Skeleton className="size-full" />
            </div>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-32" />
            {placeholders(5).map((key) => (
              <Skeleton key={key} className="h-5 w-full" />
            ))}
          </div>
        </div>
      </main>
    </SkeletonMotion>
  );
}
