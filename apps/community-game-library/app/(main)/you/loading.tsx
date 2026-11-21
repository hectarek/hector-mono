import { Skeleton } from "@repo/ui/components/skeleton";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";

// You's shape while it loads: the way back, a profile's worth of bone, then the rows.
export default function Loading() {
  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/", label: "Library" }} />}
    >
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </PageColumn>
  );
}
