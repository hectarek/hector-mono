import { Skeleton } from "@repo/ui/components/skeleton";

// The settings' shape while they load: the title, the targets and the sources. The shell stays put.
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex max-w-2xl flex-col gap-8"
    >
      <span className="sr-only">Loading</span>
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
