import { Skeleton } from "@repo/ui/components/skeleton";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";

// Past game nights while it loads: its title, then a list's worth of bone.
export default function Loading() {
  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/nights", label: "Nights" }} />}
    >
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    </PageColumn>
  );
}
