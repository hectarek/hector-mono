import { Skeleton } from "@repo/ui/components/skeleton";
import { SkeletonMotion } from "@/app/_components/page-motion";
import { placeholders } from "@/app/_lib/placeholders";

// A recipe's shape while it loads: the photo, title, actions and the first ingredients.
export default function Loading() {
  return (
    <SkeletonMotion>
      <div role="status" aria-busy="true" className="flex flex-col gap-6">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-8 w-24" />
        <div className="flex flex-col gap-3">
          <div className="aspect-video overflow-hidden rounded-xl">
            <Skeleton className="size-full" />
          </div>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-11 w-24" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-32" />
          {placeholders(5).map((key) => (
            <Skeleton key={key} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </SkeletonMotion>
  );
}
