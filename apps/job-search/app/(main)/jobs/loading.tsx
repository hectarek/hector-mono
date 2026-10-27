import { Skeleton } from "@repo/ui/components/skeleton";

// The jobs' shape while they load: the title, the views and the list. The shell stays put.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
