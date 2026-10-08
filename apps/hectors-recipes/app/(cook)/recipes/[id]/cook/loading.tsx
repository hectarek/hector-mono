import { Skeleton } from "@repo/ui/components/skeleton";
import { SkeletonMotion } from "@/app/_components/page-motion";
import { placeholders } from "@/app/_lib/placeholders";

// Cook mode's shape while it loads: the top bar (the name, then Done), Gather's
// ingredients, and the bar at the bottom.
export default function Loading() {
  return (
    <SkeletonMotion>
      <div
        role="status"
        aria-busy="true"
        className="pt-safe-2 flex flex-1 flex-col gap-6 px-4"
      >
        <span className="sr-only">Loading</span>
        <div className="flex items-center justify-between py-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-56" />
          {placeholders(6).map((key) => (
            <Skeleton key={key} className="h-11 w-full" />
          ))}
        </div>
        <Skeleton className="mt-auto mb-6 h-11 w-full" />
      </div>
    </SkeletonMotion>
  );
}
