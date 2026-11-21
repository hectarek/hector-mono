import { Skeleton } from "@repo/ui/components/skeleton";

// The Library's shape while it loads: its heading. The layout around it stays put.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-2">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-8 w-32" />
    </div>
  );
}
