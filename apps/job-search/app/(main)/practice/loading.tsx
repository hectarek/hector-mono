import { Skeleton } from "@repo/ui/components/skeleton";

// The practice log's shape while it loads: the title, the due reviews and the sessions. The shell
// stays put.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
