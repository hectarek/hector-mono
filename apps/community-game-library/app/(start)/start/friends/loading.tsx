import { Skeleton } from "@repo/ui/components/skeleton";

// Step 2's shape while it loads, under the steps' layout.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-60 w-full" />
    </div>
  );
}
