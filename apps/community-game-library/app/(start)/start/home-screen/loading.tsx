import { Skeleton } from "@repo/ui/components/skeleton";

// A6's shape while it loads: its title, the phone toggle, and the steps' worth of bone.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-52 w-full" />
    </div>
  );
}
