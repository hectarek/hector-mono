import { Skeleton } from "@repo/ui/components/skeleton";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";

// An admin page's shape while it loads, under the page's own back link. Every admin route has a
// loading.tsx of its own that renders this: a page that reads the session needs one in its own
// folder, or Next.js stops a navigation into it until its reads finish (Cache Components).
export function AdminLoading({
  back,
}: {
  back: { href: string; label: string };
}) {
  return (
    <PageColumn width="read" header={<AppHeader back={back} />}>
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </PageColumn>
  );
}
