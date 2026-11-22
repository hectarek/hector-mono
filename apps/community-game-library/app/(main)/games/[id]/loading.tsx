import { Skeleton } from "@repo/ui/components/skeleton";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";

// A game's shape while it loads: the way back, the cover's tile, the title, then a panel and the
// copies' worth of bone.
export default function Loading() {
  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/", label: "Library" }} />}
    >
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading</span>
        <Skeleton className="mx-1.5 h-38 w-auto" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    </PageColumn>
  );
}
