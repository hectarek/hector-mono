import { Skeleton } from "@repo/ui/components/skeleton";
import { SkeletonMotion } from "@/app/_components/page-motion";
import { placeholders } from "@/app/_lib/placeholders";

// The list's shape while it loads: its title, the add box and a few items.
export default function Loading() {
  return (
    <SkeletonMotion>
      <div role="status" aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only">Loading</span>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-32" />
        </div>
        <Skeleton className="h-9 w-full" />
        <div className="flex flex-col divide-y">
          {placeholders(5).map((key) => (
            <div key={key} className="flex items-center gap-3 py-3">
              <Skeleton className="size-7 shrink-0" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonMotion>
  );
}
