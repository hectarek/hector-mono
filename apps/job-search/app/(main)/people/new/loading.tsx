import { Skeleton } from "@repo/ui/components/skeleton";

// The person form's shape while the companies load.
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex max-w-2xl flex-col gap-6"
    >
      <span className="sr-only">Loading</span>
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
