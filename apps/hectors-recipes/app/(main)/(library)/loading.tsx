import { Skeleton } from "@repo/ui/components/skeleton";
import { SkeletonMotion } from "@/app/_components/page-motion";
import { placeholders } from "@/app/_lib/placeholders";

// Shown while a tab's server data loads; the header and tab bar stay in place.
export default function Loading() {
  return (
    <SkeletonMotion>
      <div role="status" aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-8 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {placeholders(6).map((key) => (
            <div key={key} className="flex flex-col gap-2">
              <div className="aspect-4/3 overflow-hidden rounded-xl">
                <Skeleton className="size-full" />
              </div>
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonMotion>
  );
}
