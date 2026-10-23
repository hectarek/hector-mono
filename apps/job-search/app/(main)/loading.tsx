import { Skeleton } from "@repo/ui/components/skeleton";

// This week's shape while it loads: its title and the week under it. The shell stays put.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-2">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-28" />
    </div>
  );
}
