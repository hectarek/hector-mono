import { Skeleton } from "@repo/ui/components/skeleton";
import { placeholders } from "@/app/_lib/placeholders";

// The plan's shape while it loads: its title, the week switcher, Plan a meal and the seven days.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">Loading</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-32" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="size-9" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="size-9" />
      </div>
      <Skeleton className="h-11 w-full" />
      <div className="flex flex-col divide-y rounded-xl border">
        {placeholders(7).map((key) => (
          <div key={key} className="p-3">
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
