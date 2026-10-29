import { Skeleton } from "@repo/ui/components/skeleton";

// The weekly review's shape while it loads: the title, the counts and the form. The shell stays
// put.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
