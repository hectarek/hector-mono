import { Skeleton } from "@repo/ui/components/skeleton";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";

// Split into tables while it loads: its title, then the tables in bone. The way
// back names Nights until the night's own title has loaded.
export default function Loading() {
  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/nights", label: "Nights" }} />}
    >
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </PageColumn>
  );
}
