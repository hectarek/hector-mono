import { Skeleton } from "@repo/ui/components/skeleton";

// A company's shape while it loads: its name, its facts and its history. The shell stays put.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
