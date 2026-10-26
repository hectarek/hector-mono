import { Skeleton } from "@repo/ui/components/skeleton";

// A job's shape while it loads: its role, where it stands, its facts and notes. The shell stays put.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
