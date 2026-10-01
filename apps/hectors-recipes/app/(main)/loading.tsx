import { Skeleton } from "@repo/ui/components/skeleton";
import { placeholders } from "@/app/_lib/placeholders";

// Shown while a page's server data loads, for pages without their own placeholder (books,
// settings, joining, account): a title and a few rows. The header and tab bar stay put.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Loading</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="flex flex-col gap-3">
        {placeholders(4).map((key) => (
          <Skeleton key={key} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
