import { Skeleton } from "@repo/ui/components/skeleton";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";

// Nights' shape while it loads: its header, then two cards' worth of bone.
export default function Loading() {
  return (
    <PageColumn width="read" header={<AppHeader title="Nights" />}>
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </PageColumn>
  );
}
