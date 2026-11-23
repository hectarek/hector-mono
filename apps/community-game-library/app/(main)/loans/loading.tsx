import { Skeleton } from "@repo/ui/components/skeleton";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";

// Loans' shape while it loads: its header, then a list's worth of bone.
export default function Loading() {
  return (
    <PageColumn width="read" header={<AppHeader title="Loans" />}>
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </PageColumn>
  );
}
