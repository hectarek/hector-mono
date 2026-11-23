import { Skeleton } from "@repo/ui/components/skeleton";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";

// Past loans while it loads: its title and toggle, then a list's worth of bone.
export default function Loading() {
  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/loans", label: "Loans" }} />}
    >
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-60 w-full" />
      </div>
    </PageColumn>
  );
}
