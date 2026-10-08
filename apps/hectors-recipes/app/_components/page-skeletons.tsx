import { Skeleton } from "@repo/ui/components/skeleton";
import { SkeletonMotion } from "@/app/_components/page-motion";
import { placeholders } from "@/app/_lib/placeholders";

// The two general loading shapes. Each page that uses one has its own `loading.tsx`: a tap
// between two pages re-renders only below the layout they share, so a loading screen at
// `(main)` or `(form)` covers a page load but not that tap (docs/ux-plan.md P28.1).

// For pages without a placeholder of their own (Books, Members, Join, Account, Copy recipes):
// a title and a few rows. The header and tab bar stay put.
export function PageSkeleton() {
  return (
    <SkeletonMotion>
      <div role="status" aria-busy="true" className="flex flex-col gap-6">
        <span className="sr-only">Loading</span>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="flex flex-col gap-3">
          {placeholders(4).map((key) => (
            <Skeleton key={key} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </SkeletonMotion>
  );
}

// The form's shape while it loads: its top bar, then a few labelled fields.
export function FormSkeleton() {
  return (
    <SkeletonMotion>
      <div
        role="status"
        aria-busy="true"
        className="pt-safe-2 flex flex-col gap-6"
      >
        <span className="sr-only">Loading</span>
        <div className="flex items-center justify-between py-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-20" />
        </div>
        {placeholders(4).map((key, index) => (
          <div key={key} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className={index === 2 ? "h-32 w-full" : "h-9 w-full"} />
          </div>
        ))}
      </div>
    </SkeletonMotion>
  );
}
