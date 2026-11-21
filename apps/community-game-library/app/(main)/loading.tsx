import { Skeleton } from "@repo/ui/components/skeleton";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";

// The Library's shape while it loads: its header, then a search field's and a list's worth of
// bone. The shell around it stays put.
export default function Loading() {
  return (
    <PageColumn width="browse" header={<AppHeader title="Library" />}>
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    </PageColumn>
  );
}
